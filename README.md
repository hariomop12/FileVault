<div align="center">

# 🔐 FileVault — Secure Distributed File Storage

**A mini-S3 in production** · S3-style multipart uploads · consistent-hash replication · self-healing storage nodes · load-tested on EC2

```
React 18 + TS  ·  Node 20 + Express  ·  PostgreSQL  ·  Cloudflare R2  ·  pm2  ·  k6
```

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare%20R2-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/products/r2/)
[![Jest](https://img.shields.io/badge/Jest-174%20tests%20%C2%B7%2023%20suites-C21325?style=flat-square&logo=jest&logoColor=white)](backend)
[![k6](https://img.shields.io/badge/k6-235%20req%2Fs%20%C2%B7%200%25%20errors-7D64FF?style=flat-square&logo=k6&logoColor=white)](k6)
[![Deploy](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions%20%E2%86%92%20webhook%20%E2%86%92%20pm2?style=flat-square&logo=githubactions&logoColor=white)](.github/workflows/deploy-ec2.yml)

**Live:** [filevault.hariomop.in](https://filevault.hariomop.in) · API health [`/api/v1/test`](https://backend.filevault.hariomop.in/api/v1/test)

</div>

---

## 📌 TL;DR — why this repo stands out

A **secure, distributed file-storage platform** (object-storage-lite) that is **deployed, load-tested, and CI/CD-driven** — not a demo:

| Capability | What's real here |
|---|---|
| 🧱 **Distributed storage engine** | Storage-node registry, consistent hashing **with virtual nodes**, replication factor 3 across **distinct** nodes, per-node heartbeat + self-healing reconciler |
| 🚚 **S3-style multipart uploads** | `Create → UploadPart → Complete/Abort`, **4× parallel** presigned parts, ETag tracking, pause/resume/retry, browser-safe R2 (CORS + checksum fix) |
| 🩺 **Failure detection that works in prod** | 30s suspicion / 90s failsafe windows, 10s scan, 15s auto-heartbeat — live-verified on `/api/v1/test` (`1 ACTIVE / 3 DOWN`) |
| ⚡ **Load-tested numbers** | **235 req/s · p95 92 ms · 0.00% errors** (read) · **~7 MB/s** per upload stream (write) — see [Performance](#-performance) |
| 🔁 **Production CI/CD** | push → tests + build → GitHub webhook → pm2 reload → health check (lock-guarded, ~60 s) |
| 🧪 **174 tests / 23 suites** | unit + integration (Jest + supertest + pg-mem), incl. hash-ring **property test** (~1/n remap on add/remove) |

---

## 🏗️ Architecture

```
                        ┌──────────────────────────────┐
                        │        Git push → main        │
                        └──────────────┬───────────────┘
                                       ▼
   ┌──────────────┐   /api   ┌───────────────────────────────────────────┐       ┌──────────────────┐
   │   Browser    │─────────▶│  nginx (:443, TLS) ──▶ Express (Node 20)   │      │  Prometheus scan  │
   │  React 18    │◀─────────│  /api/v1/*   /api-docs   /metrics          │──────│  /metrics         │
   └──────────────┘  HTTPS   └───────┬─────────────────────────┬──────────┘       └──────────────────┘
                                     │                         │
                    ┌────────────────▼────────┐   ┌────────────▼──────────────┐
                    │  PostgreSQL (Aiven 16)  │   │  Cloudflare R2 (blobs)     │
                    │  users · files · nodes  │   │  presign + multipart +     │
                    │  file_replicas          │   │  CopyObject replication    │
                    └─────────────────────────┘   └────────────────────────────┘
                                     │
                    ┌────────────────▼───────────────────────────┐
                    │  Background daemons (utils/backgroundJobs) │
                    │  · heartbeat monitor  (10s scan)           │
                    │  · instance heartbeat (15s beat)           │
                    │  · self-healing replicator (30s reconcile) │
                    └────────────────────────────────────────────┘
```

**Deployment topology (live):**

```
GitHub Actions ──(POST /__deploy, token)──▶ node webhook (:9000) ──▶ deploy.sh
         │   test: pnpm 10 ── 174 tests + frontend build              │  git reset --hard origin/main
         │                                                           │  npm install --legacy-peer-deps
         │                                                           │  frontend CI build (heap-capped)
         └───────────────────────────────────────────────────────────┴──▶ pm2 reload filevault-backend
                                                                          ▶ nginx reload → health check (200)
```

Layers follow a strict `routes → controllers → services → models` split. **Services hold the business logic**; controllers stay thin; background jobs live outside request handlers (so a replicator run can never stall an upload).

---

## 🧠 Distributed storage, how it works

### Node registry + heartbeat / failure detection
- Every storage node registers in `storage_nodes` (`ACTIVE/DEGRADED/DOWN`, capacity, replication weight).
- A daemon (`utils/backgroundJobs.js`) polls every **10 s**; health is graded from `last_heartbeat_at`:
  - age < **30 s** → `ACTIVE`
  - **30–90 s** → `DEGRADED` (suspicion window — catches flapping network)
  - > **90 s** → `DOWN`
- The running instance beats itself every **15 s** (`HEARTBEAT_NODE_ID`) so the local node stays `ACTIVE`; a node that goes silent is demoted automatically, and an admin heartbeat revives it. **Verified live** — phantom/unregistered nodes correctly show `DOWN`.

### Consistent hashing + virtual nodes
`utils/consistentHash.js` builds a ring with **virtual nodes** for balance. Property test asserts that adding/removing a node remaps **~1/n** of keys — that's the whole "why it scales" argument in one line.

### Replication + self-healing
- `REPLICATION_FACTOR` (default 3). Placement guarantees **distinct nodes**.
- `file_replicas` tracks each copy. The **self-healing reconciler** (30 s) rewrites `STALE → ACTIVE` when a node returns, marks replicas of dead nodes `STALE`, and re-copies under-replicated blobs — via S3 `CopyObject` on R2 (no local disk involved in prod).
- A node that returns with data intact gets its replicas *revived*, not blindly copied.

### S3-style multipart uploads
`POST /initiate → /part-url → /complete | /abort` built on `@aws-sdk` — the **browser** slices a file, uploads **4 parts in parallel directly to R2** via presigned URLs, tracks per-part ETags, and only the backend calls `CompleteMultipartUpload`. No full-file buffering in Node memory. Two real-world R2 fixes live in the repo:
1. **R2 CORS rules** (`scripts/configureR2Cors.js`) so browser PUTs pass preflight and expose `ETag`.
2. The SDK's **automatic checksum on the empty placeholder body** would break presigned puts with `BadDigest` — part URLs are signed with `requestChecksumCalculation: "WHEN_REQUIRED"` so real bodies checksum correctly.

### Observability
- Prometheus metrics at `/metrics` (`prom-client`, HTTP middleware timing) + committed Grafana dashboard (`grafana/dashboard.json`).
- Winston logging (file rotation, structured JSON), request IDs.

---

## ⚡ Performance — k6 load tests (live on EC2 → R2)

Ran against the production deployment: **1 vCPU / 909 MB t3.micro**, Node 20 (pm2), Aiven PostgreSQL, Cloudflare R2, through TLS on nginx. Scripts in [`k6/`](k6).

### Read path — steady 30 VU (after tuning)

| Metric | Value |
|---|---|
| Throughput | **235.7 req/s** (18,910 requests) |
| Error rate | **0.00%** |
| Latency | p50 **24 ms** · p90 **80 ms** · **p95 92 ms** · max 246 ms |
| `GET /api/v1/files` | p95 **29.5 ms** |
| `GET /api/v1/stats` (aggregate SQL) | p95 **105 ms** |
| Thresholds | all green (`p95 < 600 ms`, errors < 1%) |

### The before/after worth telling in an interview

A **60-VU spike** initially showed **4.3% errors** (500/503). Root cause found from the logs:

- Aiven hobby caps `max_connections` at **20**; the pool was sized at **20** → the app alone exhausted the DB budget on burst (`remaining connection slots reserved for SUPERUSER`).
- `config/db.js` also `console.log`-ed **every query** (event-loop drag under load).

**Fix:** pool now configures itself below the plan cap (`PG_MAX_POOL=10`) and per-query logging is gone. Same workload after the fix: **0.00% errors.** *A load test caught a real capacity bug; the fix is configuration, not a workaround.*

### Upload path (5 MB files → R2, over TLS)

| Metric | Value |
|---|---|
| Per-stream throughput | **5.9 – 7.7 MB/s** (0.7–0.8 s per 5 MB, HTTP 201) |
| Failures | 0 |
| Upload rate limit | 5/min per user (by design) |

> Single-node caveat (documented): a burst of ≥4 concurrent large uploads on the 909 MB box can trip pm2's `max_memory_restart` (700 MB) → one `502`, then **autorestart in ~1–2 s**. Self-healing verified in `/var/log/filevault`. Scale path = larger instance / the multipart path.

---

## 🧪 Testing

**174 tests / 23 suites** — Jest + supertest, DB via **pg-mem** (no external service needed):

- `tests/unit/consistentHash.test.js` — **property test**: adding/removing a node remaps ≈ 1/n keys; key→node assignments unique
- `tests/unit/backgroundJobs.test.js` — suspicion/failsafe grading, demotion, auto-heartbeat window
- `tests/unit/multipart.service.test.js` — ETag tracking, part completion, abort
- `tests/unit/storageNode.service.test.js`, `replication.service.test.js` — placement, distinct-node guarantee, STALE revive
- `tests/integration/*` — auth, files, folders, storage nodes, multipart over supertest

**CI:** every push to `main` runs install + **all 174 tests** + frontend TS build before deploy (`.github/workflows/deploy-ec2.yml`). If CI fails — **no deploy**.

```bash
cd backend && npm test          # 174 passing / 23 suites
cd backend && npm run test:coverage
```

---

## 🛠️ Tech Stack

| Layer | Choice |
|---|---|
| **Frontend** | React 18 · TypeScript · Tailwind · React Router v6 · Axios · React Hook Form + Zod |
| **Backend** | Node.js 20 · Express · CommonJS, layered `routes → controllers → services → models` |
| **Database** | PostgreSQL (Aiven) · `dbmate` migrations · pg-mem in tests |
| **Object storage** | Cloudflare R2 (S3-compatible) + LOCAL fallback · `@aws-sdk/client-s3` |
| **Auth** | JWT + bcrypt + email verification (Nodemailer/Gmail SMTP) |
| **Distributed layer** | consistent-hash ring (virtual nodes) · heartbeat daemon · self-healing replicator |
| **Observability** | Winston · prom-client (`/metrics`) · Grafana dashboard |
| **Background jobs** | in-process daemons (`utils/backgroundJobs.js`) |
| **Tests** | Jest · supertest · pg-mem · k6 (load) |
| **CI/CD** | GitHub Actions → node deploy webhook → pm2 + nginx · certbot TLS |
| **Ops** | Docker/docker-compose (dev) · pm2 (prod) · systemd · swap |

---

## 🚀 Quick start

1. **Clone + install**
   ```bash
   git clone https://github.com/hariomop12/FileVault.git && cd FileVault
   cd backend && npm install && cd ../frontend && npm install
   ```
2. **Configure `backend/.env`** (template in [`backend/.env.example`](backend/.env.example))
   ```env
   PORT=3000
   NODE_ENV=development
   DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
   JWT_SECRET=change-me JWT_EXPIRES_IN=7d
   R2_ENDPOINT=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=...
   EMAIL_HOST=smtp.gmail.com EMAIL_PORT=587 EMAIL_USER=... EMAIL_PASS=...
   FRONTEND_URL=http://localhost:3001
   ```
3. **Migrate + run**
   ```bash
   cd backend
   npm run migrate         # dbmate up
   npm run dev             # API on :3000
   # one-time: node scripts/configureR2Cors.js   (browser multipart uploads)
   ```
   ```bash
   cd frontend && npm start   # UI on :3001 (API_BASE = REACT_APP_API_URL)
   ```
4. **Admin (RBAC)**
   ```sql
   UPDATE filevault_users SET role = 'ADMIN' WHERE email = 'you@example.com';
   ```
5. **Run the load tests**
   ```bash
   k6 run -e BASE_URL=https://backend.filevault.hariomop.in \
          -e LOGIN_EMAIL=... -e LOGIN_PASSWORD=... k6/loadtest-core.js
   ```

---

## 📚 API surface (`/api/v1`, Swagger at `/api-docs`)

| Group | Endpoints |
|---|---|
| **Auth** | `POST /auth/signup` · `POST /auth/login` · `GET /auth/verify-email` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `POST /auth/resend-verification` |
| **Files (anon)** | `POST /files/upload` · `POST /files/download` |
| **Files (authed)** | `POST /upload` · `GET /files` · `GET /files/count` · `GET /files/:id` · `GET /files/:id/download` · `DELETE /files/:id` · `POST /files/:id/share` · `POST /files/:id/share-email` · `GET /storage` · `GET /stats` |
| **Folders** | `POST /folders` · `GET /folders` · `GET /folders/:id` · `DELETE /folders/:id` · `PATCH /files/:id/move` |
| **Multipart** | `POST /user/files/multipart/initiate` · `/part-url` · `/complete` · `/abort` |
| **Admin (RBAC)** | `GET /admin/users` · `PUT /admin/users/:id/role` · `GET /admin/nodes` · `POST /admin/nodes` · `PUT /admin/nodes/:id/status` · `POST /admin/nodes/:id/heartbeat` · `GET /admin/nodes/ring` · `GET /admin/nodes/ring/placement` · `GET /admin/nodes/health` · `GET /admin/replication` · `POST /admin/replication/reconcile` |
| **Ops** | `GET /api/v1/test` (health) · `GET /metrics` (Prometheus) |

---

## 📁 Project structure

```
FileVault/
├── backend/
│   ├── routes/      # thin HTTP mapping
│   ├── controllers/ # request handling (validate → call service → respond)
│   ├── services/    # BUSINESS LOGIC: storage, auth, replication, multipart
│   ├── middlewares/ # auth (JWT), RBAC, rate limiting, cache control
│   ├── models/      # DB access / row mapping
│   ├── utils/       # consistentHash, backgroundJobs, logger, monitoring
│   ├── config/      # db, R2, email, swagger clients
│   ├── migrations/  # dbmate SQL
│   └── tests/       # unit + integration (jest, supertest, pg-mem)
├── frontend/        # React 18 + TS (Tailwind, React Router, Axios)
├── k6/              # load tests (core read path + upload throughput)
├── deploy/ec2/      # pm2 ecosystem, nginx vhosts, deploy.sh, webhook, systemd
├── grafana/         # committed dashboard JSON
├── docs/            # deploy runbook (DEPLOY_EC2.md) & guides
└── .github/workflows/deploy-ec2.yml   # CI + auto-deploy webhook
```

---

## 🚢 Production deployment (EC2 — the real setup)

Single host (Co-located with an existing API box), detailed runbook in [`docs/DEPLOY_EC2.md`](docs/DEPLOY_EC2.md) and `deploy/ec2/`:

- **Backend:** pm2 `filevault-backend` (fork, `max_memory_restart` guard, systemd startup) behind nginx vhost **with Let's Encrypt TLS**.
- **Frontend:** static build served by nginx (`filevault.hariomop.in`) with cached `/static/*`; API proxied at `/api/`. Vercel deployment mirror available.
- **CI/CD:** `push → main` triggers GitHub Actions (174 tests + TS build) → calls the private webhook (`POST /__deploy`, bearer token, **concurrency-locked**) → `deploy.sh`: `git reset --hard`, install (pnpm→npm fallback for the lockfile mismatch), frontend build (heap-capped), `pm2 reload`, nginx reload, health-check to 200. Rollback = `git revert` + push.
- **DB/storage:** Aiven PostgreSQL with `PG_MAX_POOL=10` (sized below the plan's 20-connection cap), Cloudflare R2 bucket.
- **Storage nodes:** instance auto-heartbeat keeps the live node `ACTIVE`; failure detection + replicator run as background daemons.

Docker Compose dev files are included for local development.

---

## 🙏 Acknowledgments

Cloudflare R2 · Aiven · Node.js · React · and every OSS maintainer whose work ships inside this project.

---

<div align="center">

**Star ⭐ if this gives you ideas.** Built for production, proven by tests.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Hariom%20Virkhare-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/hariomop12) [![Email](https://img.shields.io/badge/Email-hariomvirkhare02%40gmail.com-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:hariomvirkhare02@gmail.com)

</div>