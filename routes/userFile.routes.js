const express = require("express");
const router = express.Router();
const UserFileController = require("../controllers/file.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { validateFileUpload } = require('../middlewares/validation.middleware');
const { uploadLimiter, createEndpointLimiter } = require('../middlewares/rateLimiting.middleware');
// Apply auth middleware to all routes
router.use(authMiddleware);

// File management routes for authenticated users
router.post(
  "/upload",
  uploadLimiter, // Rate limit for file uploads
  UserFileController.uploadMiddleware,
  validateFileUpload,
  UserFileController.uploadFilee
);
// Get a User"s" total file  Files
router.get("/files", UserFileController.getUserFiles);


// Get specific file - limit to 20 requests per minute
router.get(
    "/files/:id", 
    createEndpointLimiter(20, 1),  // 20 requests per minute
    UserFileController.getFileMetadata
  );

  
router.get("/download/:id", UserFileController.getDownloadLink);
router.delete("/files/:id", UserFileController.deleteFile);
router.post("/files/:id/share", UserFileController.createShareableLink);

module.exports = router;
