const fs = require("fs").promises;
const path = require("path");
const { query } = require("../config/db");
const { s3Client, storageConfig } = require("../config/R2");
const { CopyObjectCommand } = require("@aws-sdk/client-s3");
const logger = require("../utils/logger");
const StorageNodeService = require("./storageNode.service");

const DEFAULT_REPLICATION_FACTOR = parseInt(process.env.REPLICATION_FACTOR || "3", 10);
const REPLICA_STATUS = { ACTIVE: "ACTIVE", STALE: "STALE" };

class ReplicationService {
  replicationFactor() {
    return DEFAULT_REPLICATION_FACTOR;
  }

  replicaPathForNode(nodeName, s3Key) {
    return path.join(storageConfig.uploadDir || "./uploads", ".replicas", nodeName, s3Key);
  }

  async getNodeByName(name) {
    const result = await query(
      "SELECT id, name, type, status FROM storage_nodes WHERE name = $1",
      [name]
    );
    return result.rows.length ? result.rows[0] : null;
  }

  async copyBlobToNode(s3Key, node) {
    if (node.type === "LOCAL") {
      const src = path.join(storageConfig.uploadDir || "./uploads", s3Key);
      const dst = this.replicaPathForNode(node.name, s3Key);
      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.copyFile(src, dst);
    } else {
      await s3Client.send(
        new CopyObjectCommand({
          Bucket: storageConfig.bucketName,
          CopySource: `${storageConfig.bucketName}/${s3Key}`,
          Key: `${node.name}/${s3Key}`,
        })
      );
    }
    logger.info(`Replicated "${s3Key}" to node "${node.name}" (${node.type})`);
    return { success: true };
  }

  async recordPlacementForFile(fileId, s3Key, placement) {
    const nodeNames = new Set([placement.primary, ...placement.replicas]);
    let inserted = 0;
    for (const name of nodeNames) {
      const node = await this.getNodeByName(name);
      if (!node) continue;
      if (name !== placement.primary) {
        await this.copyBlobToNode(s3Key, node);
      }
      await query(
        `INSERT INTO file_replicas (file_id, node_id, s3_key, status)
         VALUES ($1, $2, $3, 'ACTIVE')
         ON CONFLICT (file_id, node_id) DO UPDATE SET status = 'ACTIVE', updated_at = NOW()`,
        [fileId, node.id, s3Key]
      );
      inserted++;
    }
    return { file_id: fileId, s3_key: s3Key, replicas: inserted };
  }

  async getReplicaRows(fileId) {
    const result = await query(
      `SELECT fr.id, fr.node_id, fr.status AS replica_status, fr.etag,
              sn.name AS node_name, sn.status AS node_status
       FROM file_replicas fr
       LEFT JOIN storage_nodes sn ON sn.id = fr.node_id
       WHERE fr.file_id = $1`,
      [fileId]
    );
    return result.rows;
  }

  async reconcileFile(fileId, s3Key, replicationFactor = this.replicationFactor()) {
    const rows = await this.getReplicaRows(fileId);

    const healthyNodes = new Set();
    const lostNodes = new Set();
    for (const row of rows) {
      if (row.node_status === "ACTIVE" && row.replica_status === REPLICA_STATUS.ACTIVE) {
        healthyNodes.add(row.node_name);
      } else {
        lostNodes.add(row.node_name);
      }
    }

    for (const row of rows) {
      if (lostNodes.has(row.node_name) && row.replica_status === REPLICA_STATUS.ACTIVE) {
        await query("UPDATE file_replicas SET status = 'STALE', updated_at = NOW() WHERE id = $1", [row.id]);
      }
    }

    const totalNodes = (await StorageNodeService.getAllNodes()).nodes.length;
    const desired = Math.max(1, Math.min(replicationFactor, totalNodes));
    const holding = new Set([...healthyNodes, ...lostNodes]);
    const recreated = [];

    while (healthyNodes.size + recreated.length < desired) {
      const placement = await StorageNodeService.placeFile(s3Key, replicationFactor);
      if (placement.error) break;
      const candidate = placement.replicas.find((name) => !holding.has(name));
      if (!candidate) break;
      const node = await this.getNodeByName(candidate);
      if (!node || node.status !== "ACTIVE") break;

      await this.copyBlobToNode(s3Key, node);
      await query(
        `INSERT INTO file_replicas (file_id, node_id, s3_key, status)
         VALUES ($1, $2, $3, 'ACTIVE')
         ON CONFLICT (file_id, node_id) DO UPDATE SET status = 'ACTIVE', updated_at = NOW()`,
        [fileId, node.id, s3Key]
      );
      recreated.push(candidate);
      holding.add(candidate);
    }

    return {
      file_id: fileId,
      s3_key: s3Key,
      desired,
      current: healthyNodes.size + recreated.length,
      recreated,
      healthy_nodes: [...healthyNodes],
      recovered_from_lost: [...lostNodes].length,
      repaired: recreated.length > 0,
    };
  }

  async reconcileAll(replicationFactor = this.replicationFactor()) {
    const files = await query("SELECT id, s3_key FROM filevault_files_authed ORDER BY id ASC");
    const reports = [];
    for (const file of files.rows) {
      try {
        reports.push(await this.reconcileFile(file.id, file.s3_key, replicationFactor));
      } catch (error) {
        logger.error(`Reconcile failed for file ${file.id}`, { error: error.message });
      }
    }
    return {
      files_scanned: files.rows.length,
      correction_count: reports.filter((r) => r.repaired).length,
      under_replicated: reports.filter((r) => r.current < r.desired).length,
      reports,
    };
  }

  async getReplicationReport() {
    const result = await query(
      `SELECT file_id, s3_key,
              COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_replicas
       FROM file_replicas
       GROUP BY file_id, s3_key`
    );
    const files = await query("SELECT id, s3_key FROM filevault_files_authed ORDER BY id ASC");
    const underReplicated = files.rows.filter((f) => {
      const row = result.rows.find((r) => r.file_id === f.id);
      return (row ? Number(row.active_replicas) : 0) < this.replicationFactor();
    });
    return {
      replication_factor: this.replicationFactor(),
      total_files: files.rows.length,
      under_replicated_files: underReplicated.length,
    };
  }
}

module.exports = new ReplicationService();