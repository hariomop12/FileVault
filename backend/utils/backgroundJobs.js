const StorageNodeService = require("../services/storageNode.service");
const ReplicationService = require("../services/replication.service");
const logger = require("../utils/logger");

const SUSPICION_TIMEOUT_MS = 30 * 1000;
const FAILSAFE_TIMEOUT_MS = 90 * 1000;
const SCAN_INTERVAL_MS = 10 * 1000;
const REPLICATOR_INTERVAL_MS = 30 * 1000;

function evaluateNodeHealth(status, lastHeartbeatAt, now = Date.now()) {
  const ageMs = lastHeartbeatAt ? now - new Date(lastHeartbeatAt).getTime() : Infinity;
  let desiredStatus = status;
  if (status !== "DOWN") {
    if (ageMs >= FAILSAFE_TIMEOUT_MS) desiredStatus = "DOWN";
    else if (ageMs >= SUSPICION_TIMEOUT_MS) desiredStatus = "DEGRADED";
    else desiredStatus = "ACTIVE";
  }
  return { desiredStatus, ageMs };
}

async function scanAndMarkDown() {
  let rows;
  try {
    rows = await StorageNodeService.getNodeHeartbeatState();
  } catch (error) {
    logger.error("Heartbeat health scan failed", { error: error.message });
    return;
  }

  const now = Date.now();
  for (const node of rows) {
    const { desiredStatus, ageMs } = evaluateNodeHealth(node.status, node.last_heartbeat_at, now);
    if (desiredStatus !== node.status) {
      try {
        await StorageNodeService.updateNodeStatus(node.id, desiredStatus);
        logger.warn(
          `Storage node "${node.name}" (id=${node.id}) status ${node.status} -> ${desiredStatus}`,
          { ageMs: Math.round(ageMs / 1000) }
        );
      } catch (error) {
        logger.error(`Failed to update status for node ${node.id}`, { error: error.message });
      }
    }
  }
}

let monitorTimer = null;

function startHeartbeatMonitor() {
  if (monitorTimer) return monitorTimer;
  monitorTimer = setInterval(scanAndMarkDown, SCAN_INTERVAL_MS);
  if (monitorTimer.unref) monitorTimer.unref();
  logger.info(`Heartbeat monitor started (scan every ${SCAN_INTERVAL_MS}ms)`);
  scanAndMarkDown();
  return monitorTimer;
}

function stopHeartbeatMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

async function runReplicator() {
  try {
    const result = await ReplicationService.reconcileAll();
    if (result.correction_count > 0) {
      logger.info(
        `Replicator: repaired ${result.correction_count}/${result.files_scanned} file(s)`,
        { under_replicated: result.under_replicated }
      );
    }
  } catch (error) {
    logger.error("Replicator run failed", { error: error.message });
  }
}

let replicatorTimer = null;

function startReplicator() {
  if (replicatorTimer) return replicatorTimer;
  replicatorTimer = setInterval(runReplicator, REPLICATOR_INTERVAL_MS);
  if (replicatorTimer.unref) replicatorTimer.unref();
  logger.info(`Replicator started (scan every ${REPLICATOR_INTERVAL_MS}ms)`);
  runReplicator();
  return replicatorTimer;
}

function stopReplicator() {
  if (replicatorTimer) {
    clearInterval(replicatorTimer);
    replicatorTimer = null;
  }
}

module.exports = {
  evaluateNodeHealth,
  scanAndMarkDown,
  startHeartbeatMonitor,
  stopHeartbeatMonitor,
  runReplicator,
  startReplicator,
  stopReplicator,
  SUSPICION_TIMEOUT_MS,
  FAILSAFE_TIMEOUT_MS,
  SCAN_INTERVAL_MS,
  REPLICATOR_INTERVAL_MS,
};
