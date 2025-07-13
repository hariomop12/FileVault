const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const { uploadLimiter } = require("../middlewares/rateLimiting.middleware");

// Anonymous file upload and download routes only
router.post(
    "/upload", 
    uploadLimiter,  // Add rate limiting to anonymous uploads
    fileController.uploadMiddleware, 
    fileController.uploadFile
  );
  
  router.post("/download", fileController.downloadFile);
  
  module.exports = router;