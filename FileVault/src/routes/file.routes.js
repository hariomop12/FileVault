const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const { uploadMiddleware } = require("../controllers/file.controller");

// Use the middleware from the controller
router.post("/upload", uploadMiddleware, fileController.uploadFile);

// Change to a POST route to match your controller's expectations
router.post("/download", fileController.downloadFile);

module.exports = router;