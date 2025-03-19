const express = require("express");
const router = express.Router();
const UserFileController = require("../controllers/file.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// Apply auth middleware to all routes
router.use(authMiddleware);

// File management routes for authenticated users
router.post('/upload', UserFileController.uploadMiddleware, UserFileController.uploadFile);
router.get('/files', UserFileController.getUserFiles);
router.get('/files/:id', UserFileController.getFileMetadata);
router.get('/download/:id', UserFileController.getDownloadLink);
router.delete('/files/:id', UserFileController.deleteFile);
router.post('/files/:id/share', UserFileController.createShareableLink);

module.exports = router;