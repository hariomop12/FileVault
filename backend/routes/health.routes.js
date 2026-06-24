const express = require("express");
const router = express.Router();
const { testConnection } = require("../config/db");

router.get("/test", async (req, res) => {
  const checks = {
    server: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  };

  try {
    const dbOk = await testConnection();
    checks.database = dbOk ? "UP" : "DOWN";
  } catch {
    checks.database = "DOWN";
  }

  const allOk = checks.database === "UP";
  res.status(allOk ? 200 : 503).json({
    success: allOk,
    message: allOk ? "All systems operational" : "Some checks failed",
    checks,
  });
});

module.exports = router;
