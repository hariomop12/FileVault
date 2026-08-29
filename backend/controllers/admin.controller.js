const { pool } = require("../config/db");

const AdminController = {
  listUsers: async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, name, email, role, email_verified, storage_quota, created_at FROM filevault_users ORDER BY id ASC"
      );
      res.status(200).json({
        success: true,
        count: result.rows.length,
        users: result.rows,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve users",
      });
    }
  },

  updateUserRole: async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ["ADMIN", "USER", "READ_ONLY"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        });
      }

      const result = await pool.query(
        "UPDATE filevault_users SET role = $1 WHERE id = $2 RETURNING id, email, role",
        [role, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "User role updated",
        user: result.rows[0],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update user role",
      });
    }
  },
};

module.exports = AdminController;
