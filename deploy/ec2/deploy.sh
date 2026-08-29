#!/usr/bin/env bash
#
# FileVault — zero-downtime-ish deploy (used by the GitHub webhook on push)
#   git pull → install → build → pm2 reload → nginx reload
# Run as the app user (NOT root) so pm2 hits the right daemon:
#   sudo -u ubuntu bash deploy/ec2/deploy.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/filevault/app}"
LOG=/var/log/filevault/deploy.log
export PM2_HOME="${PM2_HOME:-/home/$USER/.pm2}"
export PATH="$PATH:/usr/local/bin:/home/$USER/.local/bin"

log() { echo "[deploy $(date -u '+%F %T')] $*" | tee -a "$LOG"; }

log "=== deploy start ==="

log "pull main"
git -C "$APP_DIR" fetch --quiet --all || true
git -C "$APP_DIR" reset --hard --quiet origin/main

log "backend: install"
( cd "$APP_DIR/backend" && pnpm install --frozen-lockfile 2>/dev/null || pnpm install --silent )

log "frontend: install + build"
( cd "$APP_DIR/frontend" && pnpm install --silent && CI=true pnpm run build >/dev/null )

log "pm2 reload backend"
pm2 reload filevault-backend --update-env || pm2 start "$APP_DIR/deploy/ec2/ecosystem.config.js" --env production

log "nginx reload"
nginx -t -q && systemctl reload nginx 2>/dev/null || true

log "health check"
for i in $(seq 1 15); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/api/v1/test || true)
  if [ "$CODE" = "200" ]; then log "healthy (HTTP 200)"; exit 0; fi
  sleep 2
done
log "WARN health check did not return 200 (last=$CODE)"; exit 1