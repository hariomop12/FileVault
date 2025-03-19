const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");

// Anonymous file upload and download routes only
router.post("/upload", fileController.uploadMiddleware, fileController.uploadFile);
router.post("/download", fileController.downloadFile);

module.exports = router;