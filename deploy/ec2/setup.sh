#!/usr/bin/env bash
#
# FileVault — EC2 one-shot bootstrap (Ubuntu 22.04/24.04, single box)
#
# WHAT IT DOES
#   node 20 + pnpm, nginx, redis, app clone at /opt/filevault/app,
#   backend/.env wired, dependencies, frontend build, pm2 start, nginx site.
#   Runs the deploy webhook service too (see install-webhook.sh).
#
# USAGE
#   sudo bash setup.sh <gh-repo>   e.g.  sudo bash setup.sh hariomop12/FileVault
#
set -euo pipefail

REPO="${1:-hariomop12/FileVault}"
APP_DIR="/opt/filevault/app"
APP_USER="$SUDO_USER"
[ -z "$APP_USER" ] && APP_USER="ubuntu"

log() { echo -e "\n\033[1;36m[setup]\033[0m $*"; }

log "Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx redis-server git curl ca-certificates build-essential >/dev/null

log "Installing Node 20 + pnpm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
apt-get install -y -qq nodejs >/dev/null
npm install -g pnpm @sindresorhus/ts-node pm2 >/dev/null 2>&1 || npm install -g pm2 pnpm >/dev/null

log "Creating app user/dirs..."
useradd -m -s /bin/bash "$APP_USER" 2>/dev/null || true
mkdir -p /opt/filevault /var/log/filevault
chown -R "$APP_USER":"$APP_USER" /opt/filevault /var/log/filevault
HOME_DIR="$APP_USER" # runtime homes

log "Cloning $REPO -> $APP_DIR"
sudo -u "$APP_USER" git clone --depth 1 "https://github.com/$REPO.git" "$APP_DIR" 2>/dev/null || true
sudo -u "$APP_USER" git -C "$APP_DIR" fetch --all && sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard origin/main

log "Installing backend deps..."
cd "$APP_DIR/backend"
sudo -u "$APP_USER" pnpm install --frozen-lockfile || sudo -u "$APP_USER" pnpm install

log "Wiring backend .env"
if [ ! -f "$APP_DIR/backend/.env" ]; then
  cat > "$APP_DIR/backend/.env" <<ENVEOF
# FileVault production env — EDIT THESE (real values go here)
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
JWT_SECRET=CHANGE-ME
JWT_EXPIRES_IN=7d
R2_ENDPOINT=https://YOUR-ACCOUNT-ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=CHANGE-ME
R2_SECRET_ACCESS_KEY=CHANGE-ME
R2_BUCKET_NAME=CHANGE-ME
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=you@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=FileVault <you@gmail.com>
FRONTEND_URL=https://filevault.yourdomain.com
REPLICATION_FACTOR=3
WORKER_RUN_HEARTBEAT=1
ENVEOF
  echo "  !! FILL $APP_DIR/backend/.env then rerun this script (or run deploy/ec2/deploy.sh)"
  exit 0
fi

log "Building frontend..."
sudo -u "$APP_USER" bash -c "cd '$APP_DIR/frontend' && pnpm install && CI=true pnpm run build"

log "Registering deploy scripts + pm2..."
sed -i "s|cwd: \"/opt/filevault/app/backend\"|cwd: \"$APP_DIR/backend\"|" "$APP_DIR/deploy/ec2/ecosystem.config.js"
sudo -u "$APP_USER" pm2 start "$APP_DIR/deploy/ec2/ecosystem.config.js" --env production
sudo -u "$APP_USER" pm2 save
sudo -u "$APP_USER" pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | grep -v '^$' | bash || true

log "Installing nginx site..."
sed "s|/opt/filevault/app/frontend/build|$APP_DIR/frontend/build|; s|filevault.hariomop.in|filevault.hariomop.in|" \
    "$APP_DIR/deploy/ec2/nginx.conf" > /etc/nginx/sites-available/filevault
ln -sf /etc/nginx/sites-available/filevault /etc/nginx/sites-enabled/filevault
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable --now nginx && systemctl reload nginx

log "Starting deploy webhook..."
sudo -u "$APP_USER" bash "$APP_DIR/deploy/ec2/install-webhook.sh" "$APP_USER" "$APP_DIR"

log "DONE. Verify:"
echo "   curl http://localhost/api/v1/test"
echo "   pm2 ls   ->  filevault-backend online"
echo "   systemctl status filevault-webhook"