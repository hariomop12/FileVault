const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), fileController.uploadFile);
router.get("/download/:id", fileController.downloadFile);

module.exports = router;
