const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/admin.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");

router.use(authMiddleware);
router.use(requireRole("ADMIN"));

router.get("/users", AdminController.listUsers);
router.put("/users/:id/role", AdminController.updateUserRole);

module.exports = router;
