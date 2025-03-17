const express = require("express");
const { uploadFile, downloadFile } = require("../controllers/file.controller");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), uploadFile);
router.post("/download", downloadFile);

module.exports = router;
