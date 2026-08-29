const client = require("prom-client");

// Collect Node.js runtime metrics (CPU, memory, heap, event loop, etc.)
client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const fileUploadCounter = new client.Counter({
  name: "file_upload_total",
  help: "Total number of file uploads",
  labelNames: ["status"], // success/failure
});

const fileDownloadCounter = new client.Counter({
  name: "file_download_total",
  help: "Total number of file downloads / download-link generations",
  labelNames: ["status"], // success/failure
});

const bytesUploadedTotal = new client.Counter({
  name: "bytes_uploaded_total",
  help: "Total bytes uploaded to storage",
});

const storageNodesByStatus = new client.Gauge({
  name: "storage_nodes_by_status",
  help: "Number of storage nodes by status",
  labelNames: ["status"], // ACTIVE / DEGRADED / DOWN
});

const filesUnderReplicated = new client.Gauge({
  name: "files_under_replicated",
  help: "Number of files below the configured replication factor",
});

const hashRingNodes = new client.Gauge({
  name: "hash_ring_nodes",
  help: "Number of active nodes currently on the consistent-hash ring",
});

const multipartActive = new client.Gauge({
  name: "multipart_active_uploads",
  help: "Number of in-flight (PENDING) multipart uploads",
});

// Middleware: record per-request rate + latency. Skips the metrics/health
// scrapes themselves so dashboards stay clean.
function httpMetricsMiddleware(req, res, next) {
  if (req.path === "/metrics" || req.path.startsWith("/health")) {
    return next();
  }
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route && req.route.path ? req.route.path : req.path;
    httpRequestsTotal.inc({ method: req.method, route, status: String(res.statusCode) });
    httpRequestDurationSeconds.observe({ method: req.method, route }, durationSeconds);
  });
  next();
}

// Gauges are refreshed at scrape time from live system state, so a Prometheus
// scrape always sees current values without background polling.
async function updateSystemGauges() {
  try {
    const StorageNodeService = require("../services/storageNode.service");
    const health = await StorageNodeService.getNodeHealth();
    ["ACTIVE", "DEGRADED", "DOWN"].forEach((status) => {
      storageNodesByStatus.set({ status }, health.byStatus[status] || 0);
    });
    const { ring, nodes } = await StorageNodeService.buildRing();
    hashRingNodes.set(nodes.length);
  } catch (error) {
    // DB unavailable: gauges keep their previous (possibly stale) value.
  }

  try {
    const ReplicationService = require("../services/replication.service");
    const report = await ReplicationService.getReplicationReport();
    filesUnderReplicated.set(report.under_replicated_files);
  } catch (error) {
    // DB unavailable: keep previous value.
  }

  try {
    const { query } = require("../config/db");
    const result = await query(
      "SELECT COUNT(*)::int AS count FROM multipart_uploads WHERE status = 'PENDING'"
    );
    const pending = result.rows.length ? parseInt(result.rows[0].count, 10) : 0;
    multipartActive.set(pending);
  } catch (error) {
    // DB unavailable: keep previous value.
  }
}

module.exports = {
  client,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  fileUploadCounter,
  fileDownloadCounter,
  bytesUploadedTotal,
  storageNodesByStatus,
  filesUnderReplicated,
  hashRingNodes,
  multipartActive,
  httpMetricsMiddleware,
  updateSystemGauges,
};