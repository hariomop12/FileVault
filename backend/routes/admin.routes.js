const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin.controller");
const NodeController = require("../controllers/node.controller");
const ReplicationController = require("../controllers/replication.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.use(authMiddleware);
router.use(requireRole("ADMIN"));

// User management (RBAC demo)
router.get("/users", AdminController.listUsers);
router.put("/users/:id/role", AdminController.updateUserRole);

// Storage node management (distributed backend)
router.get("/nodes", NodeController.listNodes);
router.post("/nodes", NodeController.registerNode);
router.put("/nodes/:id/status", NodeController.updateNodeStatus);
router.post("/nodes/:id/heartbeat", NodeController.recordHeartbeat);
router.get("/nodes/ring", NodeController.getRingInfo);
router.get("/nodes/ring/placement", NodeController.getRingPlacement);
router.get("/nodes/health", NodeController.getNodeHealth);

// Replication / self-healing (admin)
router.get("/replication", ReplicationController.report);
router.post("/replication/reconcile", ReplicationController.reconcile);

module.exports = router;
