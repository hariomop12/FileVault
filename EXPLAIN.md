# FileVault — Architecture & Design Explained (Interview Prep)

> How every core feature works, why it's designed that way, and what to say if
> an interviewer pokes at it. Each section = one PLAN step. Claims here are
> **implemented, tested, and live in the repo** — no vaporware.

---

## Orientation (30-second pitch)

FileVault is a **secure distributed file-storage platform** built as an
object-storage-lite:

- **Frontend**: React 18 + TS (Tailwind, React Router, Axios)
- **Backend**: Node.js + Express (CommonJS), layered `routes → controllers →
  services → models`
- **Metadata**: PostgreSQL (pg-mem in tests, dbmate migrations)
- **Blobs**: Cloudflare R2 / S3-compatible, with a LOCAL filesystem fallback
- **Auth**: JWT + bcrypt + email verification (Nodemailer)
- **Distributed layer**: storage-node registry → consistent hash ring →
  heartbeat/failure detection → re-replication → Prometheus/Grafana → edge cache

The pitch: *"It's like a mini-S3. Files are sliced for resumable upload, placed
across real storage nodes using consistent hashing with virtual nodes, get
replicated R× on distinct nodes, and the system detects node death via
heartbeats and self-heals by re-replicating."*

---

## 1. Multipart Upload (Step 1)

### What
S3-style `CreateMultipartUpload → UploadPart → CompleteMultipartUpload`, built on
`@aws-sdk`. Frontend slices a file, uploads parts **in parallel (concurrency=4)**
via presigned URLs, tracks ETags, supports pause/resume, and only on completion
does the backend call `CompleteMultipartUpload`. An `AbortMultipartUpload`
endpoint cleans up on failure/timeout.

### Why (the hard part)
Naively `multer`-buffering a 5 GB file into Node memory would OOM the instance.
Multipart upload gives us:

- **Memory-safe streaming** — never buffer the whole file in RAM.
- **Resumability** — a dropped connection only re-uploads unfinished parts.
- **Parallelism + progress** — the browser slices and uploads chunks concurrently
  with real % progress.
- **Atomic commit** — parts are invisible until complete; no half-written files.

### Flow
1. `POST /user/files/multipart/initiate {filename, total_size}` → backend computes
   `part_size` (min 5 MiB, enough parts to cover the size, cap ~10k parts) and
   returns `upload_id`.
2. Browser slices into parts; for each part calls
   `POST /user/files/multipart/part-url {upload_id, part_number}` → backend
   returns a presigned `PUT` URL scoped to that upload+part.
3. Browser PUTs parts concurrently, caps at 4 in flight, collects `{PartNumber,
   ETag}`.
4. `POST /user/files/multipart/complete {upload_id, parts[]}` → backend validates,
   then `CompleteMultipartUpload`s to R2, records metadata in Postgres, and is
   only **now** the file visible to users.
5. If a part fails N times → `POST /user/files/multipart/abort` → R2 discards.

### Failure modes you can explain
- An incomplete upload lives as **PENDING** in `/user_files`; a background sweep
  (or explicit abort) frees orphaned parts.
- Part count exceeds caps → reject; size mismatch → reject.

---

## 2. Storage-Node Registry + Placement (Step 2)

### What
A `storage_nodes` table = a directory of nodes. Each node has a name, endpoint
(local path for LOCAL mode, S3-style endpoint for R2), a status, a `weight`
(≈ capacity), and `is_active`. Nodes register through an API and are published to
**all** processes via Redis pub/sub, so the ring and placement decisions are
eventually consistent across replicas of the API.

### Why
A distributed object store can't hardcode "where files live." The registry is the
single source of truth for: which nodes exist, their capacity, their health, and
what they're allowed to hold. It decouples **placement logic** (hash ring) from
**transport** (R2/S3/LOCAL adapter).

### Flow
1. `POST /admin/nodes/register` validates a node, inserts it, publishes an
   `node_registered` event to Redis.
2. Consumers rebuild the local consistent-hash ring lazily (see Step 5).
3. Placement: for file key `k`, ring → `REPLICATION_FACTOR` **distinct** nodes
   (Step 5 guarantees uniqueness; Step 4 persists the choice).

---

## 3. Heartbeat & Failure Detection (Step 3)

### What
A background watchdog (`backgroundJobs.js`) that:
- Scans registered nodes every `SCAN_INTERVAL_MS` (10s).
- Nodes not seen for `SUSPICION_TIMEOUT_MS` (30s) → **DEGRADED**.
- Not seen for `FAILSAFE_TIMEOUT_MS` (90s) → **DOWN**.
- Nodes report liveness via `POST /admin/nodes/:id/heartbeat`; it revives
  DOWN→ACTIVE and updates `last_heartbeat_at`.

### Why (design thinking)
We use **suspicion windows (stale timeout), not "node said it's dead."** Real
systems avoid *flapping*: a lagging-but-alive node shouldn't thrash the cluster
between healthy and dead. Two thresholds = a *soft* state (DEGRADED) that no
action needs yet, and a *hard* state (DOWN) that triggers re-replication only
after enough evidence — a classic **failure detector with suspicion** (à la
SWIM / Cassandra's phi-accrual simplified).

> Interview answer to "is a timeout a good failure detector?": *"A fixed
> timeout risks both false positives (slow node) and slow detection. We mitigate
> with a two-stage suspicion window: act only on the second, longer window.
> The right answer in production is a probabilistic detector (phi-accrual)."*

### Flow
- Watchdog tick → `SELECT ... WHERE last_heartbeat_at < now()-threshold` →
  transition status.
- Heartbeat endpoint → update timestamp, flip to ACTIVE (and set a flag the
  replicator reads so it can *immediately* re-replicate rather than wait for the
  next scan).

---

## 4. Replication & Self-Healing (Step 4)

### What
- `file_replicas` table records **which node holds which file** (copy subset).
- Placement ensures replicas land on **distinct** nodes (never the same node
  twice for one file).
- The replicator worker (`recordPlacementForFile` on upload, plus a background
  reconciler `POST /admin/replication/reconcile` and `GET /admin/replication`
  status) copies blobs to fill the deficit.
- When a node is DOWN, files that lose a replica are flagged `status =
  UNDER_REPLICATED`; the reconciler re-copies from a surviving replica to a new
  node.

### Why — the golden rule
If the system stores only one copy and that node dies, files are gone. R×
replication with **distinct-node placement** means any R-1 node failures lose
nothing — the *availability* dimension of the CAP triangle in exchange for
storage/network cost. Distinct-node is the non-negotiable correctness detail:
two replicas on the same node is zero redundancy.

### Failure modes
- Node DOWN → file still readable from other replicas (read path queries the ring,
  finds a healthy holder).
- A pre-DOWN PENDING upload references the dead node → selecting a new holder and
  re-copying; `reconcile` idempotently fills **only** the actual deficit (never
  burns bandwidth re-copying what's already healthy).
- `REPLICATOR_DISABLED=true` lets CI unit-test logic without spawning the worker.

---

## 5. Consistent Hashing + Virtual Nodes (Step 5)

### What
A pure, unit-tested util `consistentHash.js`: a `ConsistentHashRing` maps keys →
nodes on a 2^32 circle using `FNV1a` hash (or murmur), every node's `weight`
scaled into **virtual nodes** (replicas of the node identifier with suffixes),
and `addNode/removeNode` rebuilds the ring.

### Why (the "why is this hard" answer)
Naive `hash(key) % num_nodes` **destroys placement for ALL keys when the node
count changes** — adding one node re-hashes nearly every file. Consistent hashing
keeps total remapping at ~**1/n** of keys (property test in
`consistentHash.test.js` asserts this directly). Virtual nodes fix **skew**: a
small node participates proportionally to its weight, and node churn doesn't cause
a few large virtual ranges to dominate.

### What you can say
- Ring lookup = binary search over sorted points → O(log n)
- Adding/removing a node only remaps keys that hash into the adjacent arc ≈ 1/n
- Property test: with n nodes, drop one → remapping ratio ≈ 1/n (asserted in CI)

---

## 6. RBAC (Role-Based Access Control) (Step 6)

### What
- Three roles on `users`: `ADMIN`, `USER`, `READ_ONLY`.
- `rbac.middleware.js` guards admin routes (`requireRole('ADMIN')`), private file
  ops require `USER`+, public/read paths allow `READ_ONLY`.
- Composes with **ownership checks** (a USER can only touch their own
  `user_files`) and the JWT auth middleware.

### Order of concerns (say this)
1. **Authenticate** first — "who are you?" (JWT)
2. **Authorize** — "may you do this?" (role)
3. **Own** — "is this resource yours?" (ownership query)

### Why
Defense in depth: even a valid token can't touch what it doesn't own; a leaked
USER token can't hit admin endpoints; a READ_ONLY token can't write. Interview
answer on "RBAC vs ABAC": RBAC is coarse and simple — right scale for this system;
ABAC (policy per-attribute) fits enterprises with finer security matrices.

---

## 7. Observability: Prometheus + Grafana (Step 7)

### What
- `GET /metrics` (prom-client, default registry):
  - HTTP: `http_requests_total{method,status}`, `http_request_duration_seconds`
    (histogram) via a middleware; skips `/metrics` and `/health`.
  - Domain: `file_upload_total`, `file_download_total`, `bytes_uploaded_total`,
    `storage_nodes_by_status{status}`, `files_under_replicated`,
    `hash_ring_nodes`, `multipart_active_uploads`.
  - `updateSystemGauges()` recomputes gauges **at scrape time** so users don't
    have to be online for the metric to be current.
- `grafana/dashboard.json` is **committed dashboard-as-code** (uid
  `filevault-storage`): node status, upload/download ops & bytes, pending
  multipart, under-replicated files, ring size, **CDN cache hit ratio + outcomes
  by status** (from Step 8).

### Why
Distributed systems fail in confusing, cross-node ways. Uptime alerts tell you the
box is alive; **rate counters show you the failure** (rolling restart, silent
error paths). Histograms (not just averages) catch p99 latency spikes that a mean
hides. Dashboard-as-code = reviewable, versioned, deployable — same discipline as
DB migrations.

---

## 8. Edge Caching & HIT/MISS Tracking (Step 8)

### What
- `cacheControl` middleware sets Edge-visible headers:
  - **public** (shared/anon downloads) → `Cache-Control: public, max-age=3600` +
    `CDN-Cache-Control: public, s-maxage=3600`
  - **private** (authenticated, presigned-URL downloads) → `private, no-store`
- On every request it reads the upstream's `cf-cache-status` / `x-cache-status`
  (HIT/MISS/EXPIRED/STALE/REVALIDATED/DYNAMIC/UPDATING/BYPASS, else OTHER) and
  increments `cache_requests_total{status,policy}`.

### Why — the security nuance (strong interview point)
Presigned URLs are **capability tokens with an expiry**. Caching them behind a CDN
risks serving a dead/leaky URL to another visitor. So authenticated downloads are
hard `no-store`; only anonymous, unauthenticated files are CDN-cacheable. We
don't *guess* hit rates — we observe the CDN's own per-request status and expose
the ratio in Grafana, which is measurably true rather than assumed.

### Flow
1. CDN (Cloudflare) forwards request; if it has the object, answers from edge and
   stamps `cf-cache-status: HIT`, origin never sees a request.
2. Origin-bound requests carry the stamp → middleware records the outcome → the
   counter is scraped into the hit-ratio panel.

---

## Cross-cutting distributed concepts (put these together)

### Why distinct nodes for replicas
Same-node replicas are zero redundancy. Placement picks R distinct ring members;
`file_replicas` enforces it and the reconciler checks `COUNT(DISTINCT node_id)`.

### Which CAP corner does FileVault favor?
**Availability + Partition tolerance** with eventual consistency on the control
plane (node registry via pub/sub), and strong consistency on any single
transaction (Postgres = single truth for metadata). Blobs are immutable-once-
completed, which makes eventual re-replication safe — you never "overwrite"
conflicting data, you copy identical immutable bytes.

### Storage abstraction (R2 ↔ LOCAL)
`config/R2.js` resolves `R2` vs `LOCAL` from env; services only see put/get/copy.
That's what makes replication tests run on the filesystem and production on S3
without touching domain logic — the definition of a good seam.

### Background jobs not request handlers (bullmq)
Heartbeat scanning and re-replication are **workers**, not user-facing code paths.
User requests stay fast and predictable; heavy institutional work (reconcile
sweeps) runs on its own cadence and is idempotent.

### Security posture
JWT + bcrypt + email-verify on signup; rate limiters per endpoint (`createEndpointLimiter`);
ownership + RBAC checks composed; anonymous files are capability-gated by
`secret_key`; presigned URLs short-lived; never log secrets.

---

## Quick "convince the interviewer" numbers (test suite)
- **168 tests / 23 suites** — `npm test` in `backend/` (jest)
- Property test for hash-ring remapping ratio ≈ 1/n
- Heartbeat suspicion windows: 30s soft / 90s hard; scan every 10s
- 4× parallel upload parts, resume after failure
- `REPLICATION_FACTOR` default 3, distinct nodes guaranteed