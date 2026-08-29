const { pool, query } = require("../config/db");
const logger = require("../utils/logger");
const ConsistentHashRing = require("../utils/consistentHash");

const VALID_STATUSES = ["ACTIVE", "DEGRADED", "DOWN"];
const VALID_TYPES = ["LOCAL", "R2", "S3"];
const DEFAULT_REPLICATION_FACTOR = 3;

class StorageNodeService {
  async getAllNodes() {
    const result = await query(
      "SELECT id, name, endpoint, type, status, capacity_bytes, used_bytes, replication_weight, last_heartbeat_at, created_at FROM storage_nodes ORDER BY id ASC"
    );
    return { nodes: result.rows };
  }

  async getActiveNodes() {
    const result = await query(
      "SELECT id, name, endpoint, type, status, capacity_bytes, used_bytes, replication_weight FROM storage_nodes WHERE status = 'ACTIVE' ORDER BY id ASC"
    );
    return result.rows;
  }

  async getNodeById(id) {
    const result = await query(
      "SELECT id, name, endpoint, type, status, capacity_bytes, used_bytes, replication_weight, last_heartbeat_at, created_at FROM storage_nodes WHERE id = $1",
      [id]
    );
    return result.rows.length ? result.rows[0] : null;
  }

  async registerNode({ name, endpoint, type = "LOCAL", capacityBytes = 0, replicationWeight = 1 }) {
    if (!name) return { error: "Node name is required" };
    if (!VALID_TYPES.includes(type)) {
      return { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` };
    }

    const result = await query(
      `INSERT INTO storage_nodes (name, endpoint, type, status, capacity_bytes, replication_weight, last_heartbeat_at)
       VALUES ($1, $2, $3, 'ACTIVE', $4, $5, NOW())
       ON CONFLICT (name) DO UPDATE SET
         endpoint = EXCLUDED.endpoint,
         type = EXCLUDED.type,
         status = 'ACTIVE',
         capacity_bytes = EXCLUDED.capacity_bytes,
         replication_weight = EXCLUDED.replication_weight,
         last_heartbeat_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [name, endpoint || null, type, capacityBytes, replicationWeight]
    );

    return { node: result.rows[0] };
  }

  async updateNodeStatus(id, status) {
    if (!VALID_STATUSES.includes(status)) {
      return { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` };
    }
    const result = await query(
      "UPDATE storage_nodes SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );
    return result.rows.length ? { node: result.rows[0] } : { error: "Node not found" };
  }

  async recordHeartbeat(id) {
    const result = await query(
      "UPDATE storage_nodes SET last_heartbeat_at = NOW(), status = 'ACTIVE', updated_at = NOW() WHERE id = $1 RETURNING id, name, last_heartbeat_at",
      [id]
    );
    return result.rows.length ? { node: result.rows[0] } : null;
  }

  async getNodeHealth() {
    const result = await query(
      "SELECT status, COUNT(*)::int AS count FROM storage_nodes GROUP BY status"
    );
    const byStatus = {};
    result.rows.forEach((r) => (byStatus[r.status] = r.count));
    return {
      total: result.rows.reduce((acc, r) => acc + r.count, 0),
      byStatus,
    };
  }

  async buildRing(virtualNodes = 150) {
    const active = await this.getActiveNodes();
    const ring = new ConsistentHashRing(
      active.map((n) => n.name),
      Math.max(virtualNodes, active.length ? Math.ceil(150 / active.length) : 150)
    );
    return { ring, nodes: active.map((n) => n.name) };
  }

  async placeFile(key, replicationFactor = DEFAULT_REPLICATION_FACTOR) {
    const { ring, nodes } = await this.buildRing();
    if (nodes.length === 0) return { error: "No active storage nodes available" };

    const primary = ring.getNode(key);
    const replicas = ring.getNodes(key, Math.min(replicationFactor, nodes.length));

    return {
      file_key: key,
      primary,
      replicas,
      replication_factor: replicas.length,
    };
  }

  async deleteAllNodes() {
    await query("TRUNCATE storage_nodes RESTART IDENTITY CASCADE");
    return { success: true };
  }
}

module.exports = new StorageNodeService();
