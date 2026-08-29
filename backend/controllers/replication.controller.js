const ReplicationService = require("../services/replication.service");
const logger = require("../utils/logger");

const ReplicationController = {
  report: async (req, res) => {
    try {
      const report = await ReplicationService.getReplicationReport();
      res.status(200).json({ success: true, ...report });
    } catch (error) {
      logger.error(`Failed to get replication report: ${error.message}`);
      res.status(500).json({ success: false, message: "Failed to get replication report" });
    }
  },

  reconcile: async (req, res) => {
    try {
      const factor = req.body.replication_factor ? Number(req.body.replication_factor) : undefined;
      const result = await ReplicationService.reconcileAll(factor);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error(`Failed to run replication reconcile: ${error.message}`);
      res.status(500).json({ success: false, message: "Failed to run replication reconcile" });
    }
  },
};

module.exports = ReplicationController;