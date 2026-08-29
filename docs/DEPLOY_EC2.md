# FileVault — EC2 Production Deployment Runbook

Single-box production: **EC2 (Ubuntu 22.04)** runs backend (PM2), Redis (bullmq),
Nginx (frontend static + API proxy) and the deploy webhook. PostgreSQL stays on
**Aiven** (managed — frees instance RAM) and blobs stay on **Cloudflare R2**.
Anything in `deploy/ec2/` is idempotent shell/node + systemd.

## 0. What you get

```
┌────────────── EC2 (t3.small, 2GB) ──────────────┐
│  nginx  :80  → frontend build + /api → :3000    │
│  pm2    :3000 → filevault-backend (server.js)   │
│  redis            → bullmq heartbeats/reconcile │
│  webhook :9000    → GitHub POST /deploy → pm2   │
└─────────────────────────────────────────────────┘
PostgreSQL = Aiven | Blobs = R2 | DNS = filevault.hariomop.in -> EIP
```

## 1. AWS side (2 minutes)

1. Launch **Ubuntu 22.04**, `t3.small` (or `t2.small` free tier), 20GB gp3.
2. Security group open:
   - `22` SSH (your IP only), `80` HTTP, `443` HTTPS (if you enable certbot)
   - `9000` **restrict to GitHub Actions IP ranges** — or leave it closed and
     reverse-proxy the webhook through nginx on `/__deploy` (recommended below).
3. Associate an **Elastic IP**.
4. DNS: `A` record `filevault.hariomop.in → EIP`.

## 2. One-shot bootstrap on the box

```bash
ssh -i your-key.pem ubuntu@<EIP>
sudo bash -c "curl -fsSL https://raw.githubusercontent.com/hariomop12/FileVault/main/deploy/ec2/setup.sh | bash -s hariomop12/FileVault"
```

setup.sh installs node/pnpm/pm2/nginx/redis, clones the repo, writes a **template**
`backend/.env` you must fill with real values (the script prints and exits if the
env is still all placeholders).

Fill secrets, then either rerun `setup.sh` (fast, idempotent) or:

```bash
# from your laptop — push the real .env (never commit these)
scp -i your-key.pem backend/.env ubuntu@<EIP>:/opt/filevault/app/backend/.env
```

## 3. Enable the deploy webhook

```bash
ssh -x ubuntu@<EIP> sudo -u ubuntu bash /opt/filevault/app/deploy/ec2/install-webhook.sh
# paste the token it asks for, then it prints GitHub secrets to add
```

**Recommended hardening:** don't expose :9000 publicly — route it through nginx:

```nginx
location /__deploy {
    proxy_pass http://127.0.0.1:9000;
    # only allow GitHub's webhooks IPs:
    # allow 140.82.112.0/20; allow 192.30.252.0/22; allow 185.199.108.0/22; deny all;
}
```
Then `EC2_WEBHOOK_URL = https://filevault.hariomop.in/__deploy`.

## 4. GitHub secrets

Repo → Settings → Secrets and variables → Actions:

| Secret                | Value                                                |
|----------------------|------------------------------------------------------|
| `EC2_WEBHOOK_URL`     | `http://<EIP>:9000/deploy` (or nginx path)           |
| `EC2_WEBHOOK_TOKEN`   | the token from install-webhook.sh                    |

**Push to `main`** → `deploy-ec2.yml` runs backend tests + frontend build, then
`curl`s the webhook → `deploy.sh` does `git pull → install → build → pm2 reload →
health check`. `/var/log/filevault/deploy.log` has the trail.

## 5. SSL (optional but do it — it’s a storage app)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d filevault.hariomop.in
```

## 6. Load test (k6)

```bash
# local k6 binary or: docker run --rm -v "$PWD":/k6 -w /k6 grafana/k6:latest ...
k6 run -e BASE_URL=https://filevault.hariomop.in -e LOGIN_EMAIL=admin@filevault.local \
       -e LOGIN_PASSWORD='Admin@12345' k6/loadtest-core.js
k6 run -e BASE_URL=https://filevault.hariomop.in -e UP_BYTES=5242880 \
       -e LOGIN_EMAIL=admin@filevault.local -e LOGIN_PASSWORD='Admin@12345' k6/loadtest-upload.js
```

Collect **RPS, p50/p95/p99, MB/s** into EXPLAIN.md's "convince the interviewer" section.

## 7. Verify every hour

- `pm2 ls` (uptime), `systemctl status filevault-webhook nginx`
- `curl https://filevault.hariomop.in/api/v1/test` → 200
- `curl https://filevault.hariomop.in/metrics` → Prometheus
- Storage nodes dashboard: heartbeats every few seconds from the bullmq worker.