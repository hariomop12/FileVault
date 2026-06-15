const FolderService = require("../services/folder.service");
const logger = require("../utils/logger");
const crypto = require("crypto");

const handleError = (error, operation, res) => {
  const errorId = crypto.randomBytes(4).toString("hex");
  logger.error(`❌ Error ${operation} [${errorId}]: ${error.message}`, { errorId, operation, stack: error.stack });
  return res.status(500).json({ success: false, message: `Failed to ${operation}` });
};

module.exports = {
  createFolder: async (req, res) => {
    try {
      const { name, parent_folder_id } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Folder name is required" });
      }
      const result = await FolderService.createFolder(name.trim(), req.user.id, parent_folder_id || null);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      handleError(error, "create folder", res);
    }
  },

  listFolders: async (req, res) => {
    try {
      const result = await FolderService.listFolders(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      handleError(error, "list folders", res);
    }
  },

  getFolderContents: async (req, res) => {
    try {
      const result = await FolderService.getFolderContents(req.params.id, req.user.id);
      if (result.error) {
        return res.status(404).json({ success: false, message: result.error });
      }
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      handleError(error, "get folder contents", res);
    }
  },

  deleteFolder: async (req, res) => {
    try {
      const result = await FolderService.deleteFolder(req.params.id, req.user.id);
      if (result.error) {
        return res.status(404).json({ success: false, message: result.error });
      }
      res.status(200).json({ success: true, message: "Folder deleted" });
    } catch (error) {
      handleError(error, "delete folder", res);
    }
  },

  moveFileToFolder: async (req, res) => {
    try {
      const { folder_id } = req.body;
      const result = await FolderService.moveFileToFolder(req.params.id, folder_id || null, req.user.id);
      if (result.error) {
        return res.status(404).json({ success: false, message: result.error });
      }
      res.status(200).json({ success: true, message: "File moved" });
    } catch (error) {
      handleError(error, "move file", res);
    }
  },
};
