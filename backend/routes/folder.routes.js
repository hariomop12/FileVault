const express = require("express");
const router = express.Router();
const FolderController = require("../controllers/folder.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.use(authMiddleware);

router.post("/folders", FolderController.createFolder);
router.get("/folders", FolderController.listFolders);
router.get("/folders/:id(\\d+)", FolderController.getFolderContents);
router.delete("/folders/:id(\\d+)", FolderController.deleteFolder);
router.patch("/files/:id(\\d+)/move", FolderController.moveFileToFolder);

module.exports = router;
