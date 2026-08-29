const express = require("express");
const router = express.Router();
const MultipartController = require("../controllers/multipart.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.use(authMiddleware);

router.post("/initiate", MultipartController.initiate);
router.post("/part-url", MultipartController.partUrl);
router.post("/complete", MultipartController.complete);
router.post("/abort", MultipartController.abort);

module.exports = router;
