# AGENTS.md — FileVault

Guidance for AI coding agents (and human contributors) working in this repo.
The goal: **production-quality, testable, interview-defensible code** — without
unnecessary ceremony. Follow everything below; we intentionally keep it focused.

---

## 1. What this project is

A **secure distributed file-storage platform** (in active upgrade toward
object-storage features):

- **Frontend**: React 18 + TypeScript (Tailwind, React Router, Axios)
- **Backend**: Node.js + Express (CommonJS `require`, not ESM — at least in backend so far)
- **Metadata DB**: PostgreSQL (Aiven, `pg-mem` in tests), `dbmate` migrations
- **Storage**: Cloudflare R2 / S3-compatible, with LOCAL filesystem fallback
- **Auth**: JWT + bcrypt + email verification (Gmail SMTP via Nodemailer)
- **Observability**: Winston logging, `prom-client` metrics
- **Background jobs**: `bullmq` + `redis` (available, use for heartbeat/replication)
- **Tests**: Jest + supertest
- **Deploy**: Docker / docker-compose, GitHub Actions, Render/Vercel

---

## 2. Non-negotiable rules (always)

- **No secrets.** Never commit real `.env` values, API keys, passwords, or tokens.
  Use `process.env.*` and placeholder examples in docs only.
- **Never introduce `console.log`-only debugging** for real logic. Use the
  project's `logger` (`backend/utils/logger.js`). (`console.log` is allowed for
  startup/shutdown info only.)
- **Match surrounding style.** Read the neighboring file before editing.
  Backend = CommonJS `require`/`module.exports`; frontend = TypeScript.
- **Run lint and tests before finishing** any change (see §6).

---

## 3. Code style & conventions (backend)

- **JavaScript** (CommonJS) in `backend/`. ES linter rules in `.eslintrc.js`:
  - 2-space indent, single quotes, semicolons, no trailing commas
  - `prefer-const`, no `var`, no `debugger`, no `alert`
  - `require-await`, no loose/unhandled promise executor
- **Project structure follows** the existing layering — do not flatten:
  - `routes/` → thin HTTP mapping
  - `controllers/` → request handling (validate input, call service, build response)
  - `services/` → business logic (storage, auth, file ops) — **where real logic lives**
  - `middlewares/` → auth, validation, RBAC, rate limiting, cache control
  - `models/` → DB access / row mapping
  - `utils/` → shared helpers (logger, hashing, consistent-hash ring, etc.)
  - `config/` → clients (db, R2, swagger)
- Keep controllers **thin**; put logic in services. Split services by concern
  (e.g. `file.service.js`, `storageNode.service.js`, `replication.service.js`).
- **Async/await** throughout; handle rejections explicitly. Wrap service calls in
  `try/catch` at the controller boundary and return structured JSON errors.

---

## 4. Feature / distributed-storage expectations

When implementing storage/distributed features, honor these (see `PLAN.md`):

- **Multipart upload**: use `@aws-sdk` Multipart API (`CreateMultipartUpload` /
  `UploadPart` / `CompleteMultipartUpload` / `AbortMultipartUpload`). Track per-part
  ETags; support resume + retry; never buffer the whole file into memory.
- **Replication**: honor `REPLICATION_FACTOR` (default 3). Maintain `file_replicas`
  so copies land on **distinct** nodes.
- **Heartbeat / failure detection / self-healing**: implement as **background jobs**
  via `bullmq` (in `backend/utils/backgroundJobs.js` / `backend/services/`), not in
  request handlers. Use suspicion windows to avoid flapping.
- **Consistent hashing + virtual nodes**: implement as a pure, unit-tested util
  (e.g. `backend/utils/consistentHash.js`). Include property test that adding/removing
  a node only remaps ~1/n keys.
- **RBAC**: role column + `rbac` middleware (`ADMIN` / `USER` / `READ_ONLY`);
  compose with existing ownership checks.
- **Observability**: expose Prometheus at `/metrics`; keep Grafana dashboard as a
  committed JSON (`grafana/dashboard.json`).

> **Golden rule:** every new module gets **unit tests** (+ integration where it
> touches routes/DB). Interview-defensible means it must actually work and be proven.

---

## 5. Database changes

- Create a new migration under `backend/migrations/` using `dbmate` naming
  (`<timestamp>_<name>.sql`); keep them additive and reversible where possible.
- Also update `backend/db/schema.sql` to reflect the final schema.
- Never hardcode credentials; read `DATABASE_URL` from env.

---

## 6. Verification (run before you say "done")

```bash
# Backend
pnpm run lint          # or: npm run lint   (eslint)
pnpm run test          # Jest (unit + integration)

# Frontend
cd frontend && pnpm run build   # type-check + build
```

- For a feature → also run the relevant **new tests** you wrote.
- If a command isn't configured/available, say so rather than silently skipping.

---

## 7. Branching & commits

- Keep changes focused; one logical unit per commit.
- Use **conventional commit** messages (e.g. `feat:`, `fix:`, `test:`, `docs:`).
- Follow existing commit history style.
- **Never push / commit secrets.** Double-check staged files with `git status` /
  `git diff --cached` before committing.

---

## 8. What NOT to do

- ❌ Don't add new dependencies unless truly needed — reuse `@aws-sdk`, `bullmq`,
  `redis`, `prom-client`, `dbmate` already present.
- ❌ Don't put business logic in routes/controllers.
- ❌ Don't write "skeleton" or dead code claiming a feature that isn't wired/working.
  If it's in the code, it must be used, tested, and reachable.
- ❌ Don't gatekeep with over-engineering — keep it clean, explicit, and readable;
  this project values clarity over cleverness.
