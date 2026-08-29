#!/usr/bin/env bash
#
# FileVault — enable the deploy webhook on EC2
#   prompts for (or reads env) DEPLOY_TOKEN, writes systemd unit, starts it.
#
set -euo pipefail
APP_USER="${1:-$USER}"
APP_DIR="${2:-/opt/filevault/app}"
DOC="${APP_DIR}/deploy/ec2/filevault-webhook.service"

TOKEN="${DEPLOY_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  echo -n "Webhook secret (paste the DEPLOY_WEBHOOK_TOKEN you added to GitHub): "
  read -r TOKEN
fi
[ -n "$TOKEN" ] || { echo "aborting: no secret"; exit 1; }

sudo sed "s|^User=.*|User=$APP_USER|; s|DEPLOY_TOKEN=.*|DEPLOY_TOKEN=$TOKEN|" \
  "$DOC" | sudo tee /etc/systemd/system/filevault-webhook.service >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable --now filevault-webhook
sleep 1
curl -s -o /dev/null -w "webhook up? HTTP %{http_code}\n" http://127.0.0.1:9000/
echo "Test with:"
echo "  curl -X POST http://EC2_PUBLIC_IP:9000/deploy -H 'X-Deploy-Token: <secret>'"
echo "GitHub secrets to add:"
echo "  EC2_WEBHOOK_URL   = http://EC2_PUBLIC_IP:9000/deploy"
echo "  EC2_WEBHOOK_TOKEN = $TOKEN"