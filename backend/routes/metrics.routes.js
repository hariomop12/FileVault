const express = require("express");
const router = express.Router();
const { client, updateSystemGauges } = require("../utils/monitoring");

// GET /metrics — Prometheus scrape endpoint
router.get("/", async (req, res) => {
  try {
    await updateSystemGauges();
    res.set("Content-Type", client.register.contentType);
    res.send(await client.register.metrics());
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to collect metrics" });
  }
});

module.exports = router;