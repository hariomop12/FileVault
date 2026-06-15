const { query } = require("../config/db");
const logger = require("../utils/logger");

const FolderService = {
  createFolder: async (name, userId, parentFolderId = null) => {
    try {
      const result = await query(
        `INSERT INTO filevault_folders (name, user_id, parent_folder_id)
         VALUES ($1, $2, $3) RETURNING *`,
        [name, userId, parentFolderId]
      );
      return { folder: result.rows[0] };
    } catch (error) {
      logger.error(`❌ Error creating folder: ${error.message}`);
      throw new Error("Failed to create folder");
    }
  },

  listFolders: async (userId) => {
    try {
      const result = await query(
        `SELECT f.*, 
          (SELECT COUNT(*) FROM filevault_files_authed WHERE folder_id = f.id) as file_count,
          (SELECT COALESCE(SUM(file_size), 0) FROM filevault_files_authed WHERE folder_id = f.id) as total_size
         FROM filevault_folders f
         WHERE f.user_id = $1
         ORDER BY f.created_at DESC`,
        [userId]
      );
      return { folders: result.rows };
    } catch (error) {
      logger.error(`❌ Error listing folders: ${error.message}`);
      throw new Error("Failed to list folders");
    }
  },

  getFolderContents: async (folderId, userId) => {
    try {
      const folderResult = await query(
        `SELECT * FROM filevault_folders WHERE id = $1 AND user_id = $2`,
        [folderId, userId]
      );
      if (folderResult.rows.length === 0) {
        return { error: "Folder not found" };
      }
      const filesResult = await query(
        `SELECT id, filename, file_type, file_size, is_public, s3_key, created_at
         FROM filevault_files_authed
         WHERE folder_id = $1 AND user_id = $2
         ORDER BY created_at DESC`,
        [folderId, userId]
      );
      return { folder: folderResult.rows[0], files: filesResult.rows };
    } catch (error) {
      logger.error(`❌ Error getting folder contents: ${error.message}`);
      throw new Error("Failed to get folder contents");
    }
  },

  deleteFolder: async (folderId, userId) => {
    try {
      const result = await query(
        `DELETE FROM filevault_folders WHERE id = $1 AND user_id = $2 RETURNING id`,
        [folderId, userId]
      );
      if (result.rows.length === 0) {
        return { error: "Folder not found or you don't have permission" };
      }
      return { success: true };
    } catch (error) {
      logger.error(`❌ Error deleting folder: ${error.message}`);
      throw new Error("Failed to delete folder");
    }
  },

  moveFileToFolder: async (fileId, folderId, userId) => {
    try {
      if (folderId) {
        const folderResult = await query(
          `SELECT id FROM filevault_folders WHERE id = $1 AND user_id = $2`,
          [folderId, userId]
        );
        if (folderResult.rows.length === 0) {
          return { error: "Folder not found" };
        }
      }
      const result = await query(
        `UPDATE filevault_files_authed SET folder_id = $1
         WHERE id = $2 AND user_id = $3 RETURNING id`,
        [folderId, fileId, userId]
      );
      if (result.rows.length === 0) {
        return { error: "File not found" };
      }
      return { success: true };
    } catch (error) {
      logger.error(`❌ Error moving file: ${error.message}`);
      throw new Error("Failed to move file");
    }
  },
};

module.exports = FolderService;
