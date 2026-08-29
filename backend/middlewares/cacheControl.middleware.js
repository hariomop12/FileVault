const { cacheRequestsTotal } = require("../utils/monitoring");

// Standard CDN cache-status values (Cloudflare: `cf-cache-status`).
const KNOWN_CACHE_STATUSES = new Set([
  "HIT",
  "MISS",
  "EXPIRED",
  "STALE",
  "REVALIDATED",
  "DYNAMIC",
  "BYPASS",
  "UPDATING",
]);

function normalizeCacheStatus(value) {
  const status = String(value || "BYPASS").toUpperCase();
  return KNOWN_CACHE_STATUSES.has(status) ? status : "OTHER";
}

/**
 * Applies edge-cache policy headers and tracks the cache outcome as a metric.
 *
 * policy 'public'  -> public content is CDN-cacheable (Cache-Control + CDN-Cache-Control)
 * policy 'private' -> unlocked/authenticated content must never be shared-cached
 *                    (e.g. presigned URLs are capability tokens that expire).
 *
 * The upstream CDN stamps `cf-cache-status` / `x-cache-status` on the request;
 * when absent (direct origin hits) it is reported as BYPASS.
 */
function cacheControl({ policy = "private", maxAge = 3600 } = {}) {
  return (req, res, next) => {
    const headers = req.headers || {};
    const status = normalizeCacheStatus(headers["cf-cache-status"] || headers["x-cache-status"]);

    if (policy === "public") {
      res.setHeader("Cache-Control", `public, max-age=${maxAge}`);
      res.setHeader("CDN-Cache-Control", `public, s-maxage=${maxAge}`);
    } else {
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("CDN-Cache-Control", "private, no-store");
    }

    if (req.path !== "/metrics") {
      cacheRequestsTotal.inc({ status, policy });
    }
    next();
  };
}

module.exports = cacheControl;