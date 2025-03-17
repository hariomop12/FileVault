const express = require("express");
const { uploadFile, uploadMiddleware, downloadFile } = require("../controllers/file.controller");
const multer = require("multer");

const router = express.Router();

router.post("/upload", uploadMiddleware, uploadFile);
router.post("/download", downloadFile);

module.exports = router;
