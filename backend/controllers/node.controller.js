const StorageNodeService = require("../services/storageNode.service");

const NodeController = {
  listNodes: async (req, res) => {
    try {
      const { nodes } = await StorageNodeService.getAllNodes();
      res.status(200).json({ success: true, count: nodes.length, nodes });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to retrieve nodes" });
    }
  },

  registerNode: async (req, res) => {
    try {
      const { name, endpoint, type, capacity_bytes, replication_weight } = req.body;
      const result = await StorageNodeService.registerNode({
        name,
        endpoint,
        type,
        capacityBytes: capacity_bytes,
        replicationWeight: replication_weight,
      });
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      res.status(201).json({ success: true, message: "Node registered", node: result.node });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to register node" });
    }
  },

  updateNodeStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await StorageNodeService.updateNodeStatus(parseInt(id), status);
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      if (!result.node) {
        return res.status(404).json({ success: false, message: "Node not found" });
      }
      res.status(200).json({ success: true, node: result.node });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to update node status" });
    }
  },

  getRingPlacement: async (req, res) => {
    try {
      const key = req.query.key || req.params.key;
      if (!key) {
        return res.status(400).json({ success: false, message: "Missing key" });
      }
      const replicationFactor = parseInt(req.query.replicas || "3");
      const result = await StorageNodeService.placeFile(key, replicationFactor);
      if (result.error) {
        return res.status(503).json({ success: false, message: result.error });
      }
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to compute placement" });
    }
  },

  getRingInfo: async (req, res) => {
    try {
      const { ring, nodes } = await StorageNodeService.buildRing();
      res.status(200).json({
        success: true,
        ringSize: ring.ringSize(),
        activeNodes: nodes.length,
        nodes,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to build ring" });
    }
  },

  getNodeHealth: async (req, res) => {
    try {
      const health = await StorageNodeService.getNodeHealth();
      const { nodes } = await StorageNodeService.getAllNodes();
      res.status(200).json({ success: true, ...health, nodes });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to get node health" });
    }
  },
};

module.exports = NodeController;
