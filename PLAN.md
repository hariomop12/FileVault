# 🚀 FileVault — Microsoft-Worthy Upgrade Plan

> **Goal:** Turn FileVault from a solid full-stack file-storage app into a genuinely
> **distributed object-storage system** that a Microsoft / FAANG / Infosys / Wipro /
> Tech Mahindra interviewer can interrogate you on — and you can defend every line.

You asked honestly: *"which features are NOT implemented (do NOT claim these)?"*
This file (a) lists every over-claimed feature, (b) states whether the domain is right,
and (c) gives a step-by-step plan to **actually implement** each one so you can claim it
truthfully.

---

## 1. Domain — is it the right project?

**Yes. 100%. Storage systems are one of the best interview domains** because they touch
everything a senior/distributed engineer is asked about:

- Distributed systems (replication, consistency, failure detection, hashing, CAP)
- Low-level correctness (concurrency, atomicity, idempotency)
- System design (control plane vs data plane, metadata DB vs blob store)
- Security (encryption, signed URLs, RBAC, auth)
- Observability (metrics, logs, tracing)
- Performance (chunking, streaming, CDN caching, buffering big files)
- Operational maturity (CI/CD, Docker, container orchestration, IaC)

These are *literally* the topics of Microsoft Azure Storage / Azure Blob interviews.
So the **domain is right** — the current implementation is just not deep enough yet.

---

## 2. ⚠️ NOT IMPLEMENTED — do NOT claim these (current state)

These are the features from your original list that do **not** exist in the code today.
Putting them on your resume right now = you **will** be caught in a technical interview.
Interviewers ask *"how did you implement chunked upload / replication / consistent hashing?"*
and there is nothing in the repo to point to.

| Feature you listed | Reality in repo | Verdict |
|---|---|---|
| Chunked / multipart upload | `multer` buffers whole file into memory, single `PutObjectCommand` | ❌ NOT implemented |
| 3x replication | No replication logic; relies on R2's internal durability | ❌ NOT implemented |
| Storage-node heartbeat + failure detection | Only a DB health check exists; no nodes | ❌ NOT implemented |
| Automatic self-healing / re-replication | `backgroundJobs.js` is **empty (0 lines)** | ❌ NOT implemented |
| Consistent hashing + virtual nodes | Nothing; plain key lookup | ❌ NOT implemented |
| RBAC (role-based) | Only per-file ownership check; no roles table / admin / user | ❌ NOT implemented (basic authz only) |
| Edge caching HIT/MISS metrics | Relies on Cloudflare CDN; no explicit HIT/MISS tracking in code | ❌ Partial |
| Prometheus / Grafana | `prom-client` counters exist but **no `/metrics` endpoint** and **no Grafana dashboard** | ❌ Partial |

**Bottom line:** If you listed all of that on a resume today, an interviewer reading it
would expect a full distributed storage system. The repo is a good but **single-node**
storage app. Fix that gap — don't fake it.

---

## 3. ✅ Already implemented — safe to claim (Real)

These are genuinely present and defensible. You can put these on your resume as-is:

- **Full-stack**: React 18 + TypeScript frontend, Node.js/Express backend
- **JWT authentication** + bcrypt hashing + email verification (Gmail SMTP) + password reset
- **Cloudflare R2 / S3-compatible** object storage with **local-filesystem fallback**
- **Presigned URLs** for secure time-limited downloads (via `@aws-sdk/s3-request-presigner`)
- **PostgreSQL** metadata store (Aiven), `dbmate` migrations, `pg-monitor`
- **Security hardening**: Helmet, CORS, `express-rate-limit` on auth + API + upload
- **Observability**: Winston structured logging + **prom-client counters** (partial until step 7)
- **Structured codebase**: config / controllers / middlewares / models / routes / services / utils
- **Tests**: Jest **unit** + **integration** suites (auth, file, localStorage, controllers, middlewares)
- **CI/CD**: GitHub Actions (`ci.yml`, `ci-cd.yml`, `docker-build.yml`) with test + build + security jobs
- **Containerization**: Docker, docker-compose, multi-stage builds, Render deploy config
- **Swagger / OpenAPI** docs + **Postman** collection
- Health checks (`/health`, `/health/test`)

---

## 4. 🎯 The 8-Step Implementation Plan (make it real + claimable)

Each step ends with "**what to claim on resume**" — only claim after the code exists.

---

### Step 1 — Implement real Chunked / Multipart Upload
**File:** `backend/controllers/file.controller.js`, `backend/routes/userFile.routes.js`, `backend/services/file.service.js`

- Use the AWS S3 **Multipart API**: `CreateMultipartUploadCommand` → `UploadPartCommand`
  (parallel, configurable `PART_SIZE` e.g. 8MB) → `CompleteMultipartUploadCommand`, with `AbortMultipartUploadCommand` on failure/timeout.
- Add **`initiate-upload`**, **`upload-part`**, **`complete-upload`** endpoints instead of buffering the whole file.
- Frontend (`frontend/src/components/upload/`): read file client-side, slice it, upload parts concurrently with progress + retry per part.
- Handle **resumable uploads** (part → ETag persisted in DB so a dropped connection resumes).

**Claimable on resume:**
> "Designed and implemented a **resumable chunked multipart upload** pipeline using the S3 Multipart API with parallel 8MB parts, per-part ETag tracking, retry, and abort-on-failure — enabling reliable transfer of multi-GB files."

---

### Step 2 — Introduce a Storage-Node Layer + Node Registry
**New:** `backend/services/storageNode.service.js`, `backend/models/storageNode.model.js`, migration `storage_nodes`

- Define `storage_nodes` table: `id`, `name`, `endpoint`, `type` (`R2`|`LOCAL`|`S3`), `status` (`ACTIVE`|`DEGRADED`|`DOWN`), `capacity_bytes`, `used_bytes`, `last_heartbeat_at`.
- Add `storageNode.heartbeat()` that lets each node report in (updates `last_heartbeat_at` + capacity).
- Abstract file put/get so it routes to a *chosen* node instead of a hard-coded single client.

**Claimable:**
> "Modeled storage as a **registry of distributed storage nodes** with per-node status, capacity tracking, and heartbeat reporting — decoupling metadata from node placement."

---

### Step 3 — Heartbeat + Failure Detection
**File:** `backend/utils/backgroundJobs.js` (currently empty — fill it!)

- A background **daemon job** (setInterval / bullmq worker — `bullmq` is already a dependency) that, every N seconds:
  - Locks each node's heartbeat window.
  - **Failure detection**: if `now - last_heartbeat_at > TIMEOUT_MS` and no recent heartbeat → mark `DOWN` (with a suspicion tolerance to avoid flapping).
  - **Gossip-free**: for a single-process MVP, node heartbeat can be simulated/heartbeated by the process; but the *detection logic* is real and tested.
- Expose node health in `/health` and a new `/nodes` admin route.

**Claimable:**
> "Built a **background watchdog** that performs **periodic heartbeat liveness checks and failure detection** across storage nodes, with suspicion windows to prevent flapping, and demotes failed nodes to DOWN."

---

### Step 4 — Self-Healing / Re-replication
**Same file:** `backend/utils/backgroundJobs.js` + `backend/services/replication.service.js`

- **Replication factor config**: `REPLICATION_FACTOR = 3` (default) per file.
- Replicator job:
  - For each file, ensure it has `REPLICATION_FACTOR` copies on **distinct** nodes.
  - If a node holding a copy is `DOWN` → pick a new healthy node → **copy** (re-replicate) → update replicas table → mark repaired.
  - If a DOWN node comes back, offer a "rebalance" pass.
- New table `file_replicas (file_id, node_id, status, chunk_etag)`.

**Claimable:**
> "Implemented **self-healing re-replication**: a background replicator monitors replica count per file, detects lost copies on failed nodes, and **automatically re-replicates onto healthy nodes** to restore the configured replication factor."

---

### Step 5 — Consistent Hashing + Virtual Nodes
**New:** `backend/utils/consistentHash.js` (pure, unit-tested ring)

- Implement a **consistent hash ring** with `vnodes` (e.g. 100–200 per physical node).
- `hash(key) = ring.find(sha256/crc32(key))` → picks the node owning a key.
- Add/remove a node → only a small fraction of keys re-map (the classic property).
- Route file placement through the ring in `file.service.js`; expose `hashRing.status()`.
- **Unit tests**: property test that adding/removing one node only remaps ~`1/n` of keys.

**Claimable:**
> "Built a **consistent-hashing ring with virtual nodes** for key-to-node placement, providing minimal remapping on node addition/removal — a core distributed-storage technique."

---

### Step 6 — Real RBAC (Role-Based Access Control)
**Files:** `backend/models/user.model.js`, `backend/middlewares/auth.middleware.js`, new `backend/middlewares/rbac.middleware.js`, migration

- Add `role` column: `ADMIN` | `USER` | `READ_ONLY` (default `USER`).
- `rbac('ADMIN')` and `rbacScope('files.write')` middleware.
- Admin-only routes: user management, node management, replica/rebalance controls.
- Ownership + role checks compose (e.g. only ADMIN can delete others' files; USER can manage own).

**Claimable:**
> "Implemented **fine-grained RBAC** with role middleware (ADMIN / USER / READ_ONLY) and route-level authorization — beyond basic ownership checks."

---

### Step 7 — Prometheus /metrics Endpoint + Grafana Dashboard
**Files:** `backend/routes/metrics.routes.js`, `backend/utils/monitoring.js`, new `grafana/dashboard.json`

- Register prom-client **collectDefaultMetrics()** and expose `GET /metrics`.
- Add counters/gauges: upload/download by status, **bytes transferred**, **node status**, **replica lag**, **hash-ring size**, **multipart active/aborted**.
- Commit a **Grafana dashboard JSON** (dashboard as code) with panels: request rate, error rate, node health, latency, replica health.

**Claimable:**
> "Exposed **Prometheus metrics** (`/metrics`) with a Grafana dashboard-as-code for node health, replication health, throughput and error rates — production observability."

---

### Step 8 — Edge Caching HIT/MISS + CDN visibility
**File:** `backend/middlewares/cacheControl.middleware.js`, route wiring

- Add `Cache-Control` / `CDN-Cache-Control` headers on public/shared downloads.
- Track `x-cache-status` (HIT/MISS via upstream CDN header) and expose as a metric.

**Claimable:**
> "Configured **CDN edge-cache control** with HIT/MISS tracking surfaced into metrics for load on origin."

---

## 5. 🏗️ How to present it on the Resume (Microsoft-grade)

**Project title:**
> **FileVault — A Distributed Object-Storage Platform (S3-compatible)**

**Bullets (each one matches a real, implemented feature):**
1. Architected a **distributed object-storage** backend (Express + PostgreSQL + Cloudflare R2/S3) supporting **multi-node placement via consistent hashing with virtual nodes**.
2. Implemented **resumable chunked multipart upload** (parallel parts, ETag tracking, retry, abort) for multi-GB files.
3. Built **storage-node heartbeat, failure detection, and self-healing re-replication** to maintain a configurable replication factor across nodes.
4. Secured the platform with **JWT auth, signed/presigned URLs, and role-based access control (RBAC)**.
5. Added **Prometheus metrics + a Grafana dashboard** and **CDN edge caching with HIT/MISS tracking** for observability and performance.
6. Delivered a **CI/CD pipeline** (GitHub Actions), **Docker/Compose** deployment, **Swagger/OpenAPI** docs, and **unit + integration test suites** (Jest).

> 🚨 **Rule:** after each step, add the corresponding bullet **only after the code + tests are actually written**. Interviewers love this project because *you* know it end-to-end.

---

## 6. Suggested Implementation Order (dependency-aware)

### CORE (must-do — do this, lock it, then STOP or add breadth)

| Order | Step | Depends on |
|---|---|---|
| 1 | **Step 5 — Consistent hashing** (pure util + tests, fast win) | — |
| 2 | **Step 6 — RBAC** (add role column + middleware) | — |
| 3 | **Step 2 — Storage-node registry** | — |
| 4 | **Step 1 — Multipart upload** | — |
| 5 | **Step 3 — Heartbeat + failure detection** | Step 2 |
| 6 | **Step 4 — Self-healing re-replication** | Step 2, 3 |
| 7 | **Step 7 — Prometheus /metrics + Grafana** | all |
| 8 | **Step 8 — Edge caching HIT/MISS** | Step 7 |

**Start with Steps 5 & 6** (self-contained, testable, high interview-value) → then the
distributed-data plane (2→3→4) → then observability (7→8).

### OPTIONAL BREADTH (only after core is complete & locked)

| Order | Step | Depends on |
|---|---|---|
| 9 | **Step 9 — gRPC internal node RPC** (HIGHLY recommend: high interview value) | Steps 2–5 |
| 10 | **Step 10 — Local Kubernetes (kind/minikube) + manifests** (light) | Step 8 |

> **Core pehle, breadth baad.** Steps 9 & 10 optional hain — inko tabhi karo jab
> Steps 1–8 complete, tested, aur defendable ho.

---

## 7. Tooling already in the repo you'll reuse (don't reinvent)

- `bullmq` + `redis` → background jobs (heartbeat, replicator) already a dependency.
- `@aws-sdk/*` → multipart + presigned already present.
- `prom-client` → metrics already present.
- `dbmate` → new migrations (storage_nodes, file_replicas, add role).
- **Jest + supertest + pg-mem** → unit/integration tests for every new module.
- GitHub Actions → already wired; extend with new test jobs.

---

### Step 9 — gRPC for Internal Node Communication (OPTIONAL / HIGH VALUE)
**New:** `backend/proto/storage.proto`, `backend/services/grpcServer.js`, `grpcClient.js`

Why it fits: you already have a distributed-storage domain (heartbeat + re-replication +
consistent-hash node selection from Steps 2–5). Turning the **internal control plane**
(storage-node ↔ orchestrator) into gRPC is a *natural* fit — not bolted on.

- Define a `.proto` (e.g. `StorageNodeService` with `Heartbeat`, `Replicate`, `DeleteCopy`,
  `GetObject` RPCs using protobuf messages).
- Implement a small gRPC server per "node" and a client used by the orchestrator for
  heartbeats / re-replication instead of plain HTTP.
- Keep HTTP/REST as the **external** public API; gRPC is the **internal** node-to-node
  protocol (the classic pattern: REST for clients, gRPC for internals).
- Unit-test the heartbeat/replicate RPC round-trip (in-process).

**Claimable (only after implemented + tested):**
> "Used **gRPC + protobuf for internal storage-node communication** (heartbeat, replication),
> keeping the public REST API for clients — mirroring real cloud control/data-plane separation."

> 🧠 Interview talking points unlocked: "Why gRPC over REST for internals?" (HTTP/2
> multiplexing, typed schemas via proto, binary efficiency, streaming) — one of the most
> asked system-design questions. Having a *real* implementation makes you credible.

---

### Step 10 — Local Kubernetes Deployment (OPTIONAL / LIGHT)
**New:** `k8s/*.yaml` (deployment, service, configmap, secret, web + metrics probes)

How to keep it light & honest (this is the "light k8s", not the OUT-OF-SCOPE heavy one):
- Commit **declarative k8s manifests** for the backend (Deployment, Service, ConfigMap,
  Secrets, liveness + readiness probes, resource limits).
- Deploy **locally** via `kind`/`minikube` (single-node cluster) and show it runs —
  no real multi-host cloud cluster, no autoscaling/Helm chaos. That's enough breadth.
- Wire CI to optionally build + push image; keep `docker-compose` as the dev fallback.

**Claimable (only after implemented):**
> "Containerized and deployed the backend on **Kubernetes (kind/minikube)** with
> declarative manifests, ConfigMaps/Secrets, and liveness/readiness probes."

> 🧠 Adds breadth for "deployment" resume line and lets you speak to Pods/Deployments/
> Services/Probes at a level real candidates touch, without the heavy production rabbit hole.

---

## 8. Final Reality Check ✅

| Question | Answer |
|---|---|
| Is the domain right for Microsoft? | **Yes** — distributed storage is a top-tier interview domain. |
| Can I claim the over-claimed features today? | **No** — implement first. |
| What can I claim TODAY? | Section 3 list (all real). |
| **CORE (must-do)** | Steps 1–8 — the divide-and-conquer distributed features. |
| **OPTIONAL (nice breadth)** | Steps 9 (gRPC) + 10 (local k8s) — only after core is done & locked. |
| What will I claim AFTER the plan? | A genuinely distributed, self-healing, secure, observable storage platform — with modern internals (gRPC) and modern deployment (k8s). |

**→ Core action:** implement Steps 5→6→2→1→3→4→7→8 in order, write tests for each,
then update your resume bullets per Section 5. **Then** — if you still want breadth —
add Steps 9 (gRPC) and 10 (local k8s).

----

## 9. 🛑 SCOPE CONTROL — The "Stop Point" (READ THIS FIRST)

> **Bhai, tu bilkul sahi bol raha hai.** Ye ek product nahi, **interview project** hai.
> Kaam tab tak karna hai jab tak tum usse **comfortably defend** kar sakte ho —
> uske baad **ROK DENA HAI.** Koi cheez zyada banayegi nahi, koi production service nahi.

### The core mindset

- **Target = interview level, NOT production grade.**
- Ek feature tabhi dalo jab tu uske har line ko samjha aur bata sake.
- **Depth over breadth:** 8 features jinme tu 95% confident hai >> 25 features jinme 40% confident hai.
- Scope badhane se pehle khud se puch: **"Kya isse interview me mera score badhega?"**
  Agar haan nahi → **MAT KARO.**

### The exact STOP POINT (after completing all 8 steps)

Ise achieve karne ke baad **rewind/scope-lock** karo:

| Stop condition | Meaning |
|---|---|
| ✅ Steps 1–8 implement + tested | Sab features wired, tests green |
| ✅ Har feature explainable | 30-sec + 5-min explanation ready, no "mujhe pata nahi ye kya kar raha" |
| ✅ Resume bullets = Section 5 | Aur isse zyada koi claim nahi |
| ✅ Code readable + commented (only where needed) | Ek stranger (ya 6 mahine ka tu) samajh sake |

**In conditions meet hone ke baad: PROJECT DONE. STOP. Aage mat badho.**
(Note: Steps 9 & 10 — gRPC + local k8s — are **optional breadth** that come *after*
the core stop point is locked. Kancha pad: core pehle, breadth baad.)

### Explicitly OUT OF SCOPE (do NOT build — interview value ≈ 0)

- ❌ Real multi-host deployment / orchestrating multiple actual server nodes
  (apne laptop/LOCAL par single-process simulate karna hi kaafi hai —
  gRPC/k8s step ka matlab bhi LOCAL demo hai, real cloud cluster nahi)
- ❌ True distributed consensus (Raft/Paxos from scratch) — bus describe kar sakte ho
- ❌ Production-grade auth flows (OAuth, SSO, 2FA)
- ❌ Multi-tenant SaaS billing / plans / subscription
- ❌ Heavy ML/analytics layer
- ❌ Perfect 99.999% uptime SRE setup, **real autoscaling**, chaos engineering tooling
- ❌ **Heavy k8s** — Helm charts, multi-node cloud cluster, service mesh (Istio/Linkerd),
  autoscaling/HPA, observability stack — **SIRF light local kind/minikube hona hai**
- ❌ Polish jo sirf "looks good in demo" ke liye ho, logic wali depth nahi

> Inme se koi larai tumhe interview me **nahi** fayda degi — bas time aur scope jalaogi.
> Interviewer ek distributed-storage **concept + implementation** dekhna chahta hai,
> product ka production-scale SaaS nahi.
>
> BUT: **gRPC (internal control plane)** aur **light local k8s** ko OUT-OF-SCOPE me
> nahi gina — inhe optional breadth ke roop me add kiya gaya hai (Steps 9 & 10)
> kyunki inke interview value > effort. Bas **heavy** wale variants out-of-scope hain.

### Scope discipline rules

1. **Feature adi karne se pehle:** kya wo Section 5 ke resume bullets ko touch karta hai?
   Agar nahi → skip.
2. **Har naya step @ interview value > effort** hoga. Cheap to add, high value → do it.
3. **"Interesting but extra"** → tabhi do jab core (Steps 1–8) already **locked complete**
   ho. Pehle core master karo, phir breadth (gRPC/local-k8s) ka fayda uthao.
4. **When in doubt → diamond rule:** *Kya main ise 1 line me clear karke bata sakta hoon?*
   Agar nahi, to wo feature utna deep nahi hai jitna lagta hai — yaa to use simplify ya skip.

### Anti-pattern to avoid (tu sahi bol raha tha)

**"Bhaaao" pattern ☹️** — feature ke upar feature banate jana, kyunki lagta hai
"aur impressive dikhega". Isse hota hai: project hamesha "almost done" rehta hai,
kabhi khatam nahi hota, aur koi feature properly master nahi hota.
**Anti-dote:** Scope-lock on, ise baar-baar re-read, aur Step 8 ke baad ROK.

### How to think about "more tech" (Kubernetes, gRPC, etc.)

Tumne puchha: *"Kubernetes + gRPC use karna hai, kya karu?"* — seedha jawab:

- **gRPC = YES, karo** (Step 9). Ye distributed-storage domain me **fit** hota hai
  (internal node RPC), chhota hai, aur ek bohot puchhe jaane wala system-design topic
  hai. Light + high value.
- **Kubernetes = HALKAA karo** (Step 10). Real multi-node cloud cluster chhodo;
  bas **committed manifest files + local kind/minikube demo** kaafi hai. Ye breadth
  deta hai bina production rabbit hole me gire.
- **Rule:** Ye dono **after core** hain, optional hain, aur agar interview demand na
  ho to skip kar sakte ho. Core (Steps 1–8) hamesha pehle.

---

## 10. One-liner takeaway 🎯

**Acha project wahi hai jo **khatam** ho aur jisme tum apne har feature ko defend kar
sako — woh nahi jo sab kuch try kare aur kuch master na kare.**
Chhotta, complete, defendable >> bada, half-done, shaky.

**→ ACTION (scope-locked): Implement Steps 5→6→2→1→3→4→7→8 → write tests →
update resume (Section 5) → call it DONE. Tai. 🛑**
