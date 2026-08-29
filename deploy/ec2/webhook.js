#!/usr/bin/env node
//
// FileVault — GitHub deploy webhook receiver
//   POST /deploy  with header  X-Deploy-Token: <SECRET>
//   fires `deploy.sh` via a systemd user service (its own unit), returns 202.
// Run under systemd: deploy/ec2/filevault-webhook.service
//
const http = require("http");
const fs = require("fs");
const { spawn } = require("child_process");

const SECRET = process.env.DEPLOY_TOKEN || process.argv[2] || "change-me";
const APP_DIR = process.env.APP_DIR || "/opt/filevault/app";
const APP_USER = process.env.APP_USER || process.env.USER || "ubuntu";
const PORT = parseInt(process.env.DEPLOY_PORT || "9000", 10);
const LOCK = `${APP_DIR}/.deploy.lock`;

function lockBusy() {
  try {
    const pid = parseInt(fs.readFileSync(LOCK, "utf8").trim(), 10);
    if (Number.isInteger(pid) && pid > 0) {
      try { process.kill(pid, 0); return true; } // still running
      catch (e) { if (e.code === "ESRCH") fs.rmSync(LOCK, { force: true }); }
    }
  } catch { /* no lock */ }
  return false;
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/deploy") {
    const token = req.headers["x-deploy-token"];
    if (!token || token !== SECRET) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, message: "bad token" }));
    }
    if (lockBusy()) {
      res.writeHead(409, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, message: "deploy already running" }));
    }
    const child = spawn("sudo", ["-u", APP_USER, "-n", "bash",
      `${APP_DIR}/deploy/ec2/deploy.sh`], { stdio: "ignore", detached: true });
    child.unref();
    fs.writeFileSync(LOCK, String(child.pid));
    child.on("exit", () => fs.rmSync(LOCK, { force: true }));
    child.on("error", () => fs.rmSync(LOCK, { force: true }));
    // Don't block the response on the deploy itself
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, message: "deploy queued" }));
    console.log(new Date().toISOString(), "deploy triggered");
    return;
  }
  res.writeHead(404).end("FileVault webhook\n");
});

server.listen(PORT, "0.0.0.0", () =>
  console.log(`filevault-webhook listening on :${PORT}`));
process.on("uncaughtException", (e) => console.error("fatal", e));