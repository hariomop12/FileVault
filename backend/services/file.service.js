const { s3Client, storageConfig } = require("../config/R2");
const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { pool, query } = require("../config/db");
const crypto = require("crypto");
const logger = require("../utils/logger");
const LocalStorageService = require("./localStorage.service");

// Initialize local storage service if not using R2
const localStorage = storageConfig.type === 'LOCAL' ? new LocalStorageService(storageConfig.uploadDir) : null;

const FileService = {
  // Get all files for a user
  getUserFiles: async (userId) => {
    try {
      console.log(`Getting files for user ID: ${userId}`);

      const result = await query(
        `SELECT id, filename, file_type, file_size, is_public, s3_key, created_at 
         FROM filevault_files_authed
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      console.log("Query result:", result);
      console.log(`Number of files found: ${result.rows.length}`);
      // If no files found, return empty array
      if (result.rows.length === 0) {
        return { files: [] };
      }

      // Make Presigned URL for each file

      const filesWithUrls = await Promise.all(
        result.rows.map(async (file) => {
          try {
            let url;

            if (storageConfig.type === 'LOCAL') {
              // For local storage, generate a simple URL
              url = localStorage.getFileUrl(file.s3_key);
            } else {
              // For R2, generate presigned URL
              const command = new GetObjectCommand({
                Bucket: storageConfig.bucketName,
                Key: file.s3_key,
              });

              url = await getSignedUrl(s3Client, command, {
                expiresIn: 3600,
              });
            }

            return {
              id: file.id,
              filename: file.filename,
              file_type: file.file_type,
              file_size: file.file_size,
              is_public: file.is_public,
              created_at: file.created_at,
              download_url: url,
            };
          } catch (error) {
            logger.error(
              `❌ Error generating URL for file ${file.id}: ${error.message}`
            );
            // If we can't generate a URL, return file without URL
            return {
              id: file.id,
              filename: file.filename,
              file_type: file.file_type,
              file_size: file.file_size,
              is_public: file.is_public,
              created_at: file.created_at,
              download_url: null,
              error: "Could not generate download URL",
            };
          }
        })
      );

      return { files: filesWithUrls };
    } catch (error) {
      logger.error(`❌ Error getting user files: ${error.message}`);
      throw new Error("Failed to retrieve user files");
    }
  },

  // Get file metadata by ID
  getFileById: async (fileId, userId) => {
    try {
      const result = await query(
        `SELECT id, filename, file_type, file_size, is_public, 
                s3_key, created_at, access_token
         FROM filevault_files_authed 
         WHERE id = $1 AND user_id = $2`,
        [fileId, userId]
      );

      if (result.rows.length === 0) {
        return { error: "File not found or you don't have permission" };
      }

      return { file: result.rows[0] };
    } catch (error) {
      logger.error(`❌ Error getting file metadata: ${error.message}`);
      throw new Error("Failed to retrieve file metadata");
    }
  },

  // Generate download link for a file
  getDownloadLink: async (fileId, userId) => {
    try {
      // Verify file belongs to user or is public
      const result = await query(
        `SELECT id, filename, s3_key, user_id 
         FROM filevault_files_authed 
         WHERE id = $1 AND (user_id = $2 OR is_public = true)`,
        [fileId, userId]
      );

      if (result.rows.length === 0) {
        return { error: "File not found or you don't have permission" };
      }

      const fileData = result.rows[0];

      // Generate signed URL
      const command = new GetObjectCommand({
        Bucket: storageConfig.bucketName,
        Key: fileData.s3_key
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600,
      });

      return {
        file_id: fileData.id,
        file_name: fileData.filename,
        download_url: signedUrl,
        expires_in: "1 hour",
      };
    } catch (error) {
      logger.error(`❌ Error generating download link: ${error.message}`);
      throw new Error("Failed to generate download link");
    }
  },

  // Delete a file
  deleteFile: async (fileId, userId) => {
    try {
      // First retrieve the file to get S3 key
      const fileResult = await query(
        `SELECT s3_key FROM filevault_files_authed WHERE id = $1 AND user_id = $2`,
        [fileId, userId]
      );

      if (fileResult.rows.length === 0) {
        return { error: "File not found or you don't have permission" };
      }

      const s3Key = fileResult.rows[0].s3_key;

      try {
        // Delete from S3
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: storageConfig.bucketName,
            Key: s3Key,
          })
        );
      } catch (s3Error) {
        logger.error(`S3 deletion error: ${s3Error.message}`);
        // Continue with database deletion even if S3 deletion fails
      }

      // Delete from database
      await query(
        `DELETE FROM filevault_files_authed WHERE id = $1 AND user_id = $2`,
        [fileId, userId]
      );

      return { success: "File deleted successfully" };
    } catch (error) {
      logger.error(`❌ Error deleting file: ${error.message}`);
      throw new Error("Failed to delete file");
    }
  },

  // Create shareable link
  createShareableLink: async (fileId, userId) => {
    try {
      // Check if file exists and belongs to user
      const fileResult = await query(
        `SELECT id FROM filevault_files_authed WHERE id = $1 AND user_id = $2`,
        [fileId, userId]
      );

      if (fileResult.rows.length === 0) {
        return { error: "File not found or you don't have permission" };
      }

      // Generate access token if it doesn't exist
      const accessToken = crypto.randomBytes(16).toString("hex");

      // Update file with access token and set to public
      await query(
        `UPDATE filevault_files_authed SET access_token = $1, is_public = true WHERE id = $2`,
        [accessToken, fileId]
      );

      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const shareableLink = `${baseUrl}/shared/${accessToken}`;

      return {
        file_id: fileId,
        shareable_link: shareableLink,
      };
    } catch (error) {
      logger.error(`❌ Error creating shareable link: ${error.message}`);
      throw new Error("Failed to create shareable link");
    }
  },

  // Get user's total storage usage
  getUserStorage: async (userId) => {
    try {
      console.log(`Getting storage usage for user ID: ${userId}`);

      const result = await query(
        `SELECT COALESCE(SUM(file_size), 0) as total_storage_used
         FROM filevault_files_authed
         WHERE user_id = $1`,
        [userId]
      );

      const totalStorageUsed = parseInt(result.rows[0].total_storage_used) || 0;
      const storageLimit = 2 * 1024 * 1024 * 1024; // 2GB in bytes
      const storageUsedMB = Math.round(totalStorageUsed / (1024 * 1024));
      const storageLimitMB = Math.round(storageLimit / (1024 * 1024));
      const percentageUsed = Math.round((totalStorageUsed / storageLimit) * 100);

      return {
        total_storage_used: totalStorageUsed,
        storage_limit: storageLimit,
        storage_used_mb: storageUsedMB,
        storage_limit_mb: storageLimitMB,
        percentage_used: percentageUsed,
        remaining_storage: Math.max(0, storageLimit - totalStorageUsed)
      };
    } catch (error) {
      logger.error(`❌ Error getting user storage: ${error.message}`);
      throw new Error("Failed to retrieve user storage information");
    }
  },

  // Get user's total file count
  getUserFileCount: async (userId) => {
    try {
      console.log(`Getting file count for user ID: ${userId}`);

      const result = await query(
        `SELECT COUNT(*) as total_files
         FROM filevault_files_authed
         WHERE user_id = $1`,
        [userId]
      );

      return {
        total_files: parseInt(result.rows[0].total_files) || 0
      };
    } catch (error) {
      logger.error(`❌ Error getting user file count: ${error.message}`);
      throw new Error("Failed to retrieve user file count");
    }
  },

  // Get comprehensive user statistics (cool feature!)
  getUserStats: async (userId) => {
    try {
      console.log(`Getting comprehensive stats for user ID: ${userId}`);

      // Get storage info
      const storageResult = await query(
        `SELECT COALESCE(SUM(file_size), 0) as total_storage_used, COUNT(*) as total_files
         FROM filevault_files_authed
         WHERE user_id = $1`,
        [userId]
      );

      // Get file type breakdown
      const fileTypeResult = await query(
        `SELECT
           CASE
             WHEN file_type LIKE 'image/%' THEN 'Images'
             WHEN file_type LIKE 'video/%' THEN 'Videos'
             WHEN file_type LIKE 'audio/%' THEN 'Audio'
             WHEN file_type IN ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain') THEN 'Documents'
             WHEN file_type LIKE 'application/%' THEN 'Applications'
             ELSE 'Other'
           END as category,
           COUNT(*) as count,
           COALESCE(SUM(file_size), 0) as size
         FROM filevault_files_authed
         WHERE user_id = $1
         GROUP BY category
         ORDER BY size DESC`,
        [userId]
      );

      // Get recent activity (last 7 days)
      const recentResult = await query(
        `SELECT COUNT(*) as recent_uploads
         FROM filevault_files_authed
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      );

      // Get public files count
      const publicResult = await query(
        `SELECT COUNT(*) as public_files
         FROM filevault_files_authed
         WHERE user_id = $1 AND is_public = true`,
        [userId]
      );

      const totalStorageUsed = parseInt(storageResult.rows[0].total_storage_used) || 0;
      const totalFiles = parseInt(storageResult.rows[0].total_files) || 0;
      const storageLimit = 2 * 1024 * 1024 * 1024; // 2GB in bytes

      // Format file type breakdown
      const fileTypeBreakdown = fileTypeResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count),
        size: parseInt(row.size),
        size_mb: Math.round(parseInt(row.size) / (1024 * 1024))
      }));

      return {
        overview: {
          total_files: totalFiles,
          total_storage_used: totalStorageUsed,
          storage_limit: storageLimit,
          storage_used_mb: Math.round(totalStorageUsed / (1024 * 1024)),
          storage_limit_mb: Math.round(storageLimit / (1024 * 1024)),
          percentage_used: Math.round((totalStorageUsed / storageLimit) * 100),
          remaining_storage: Math.max(0, storageLimit - totalStorageUsed)
        },
        file_types: fileTypeBreakdown,
        activity: {
          recent_uploads_7d: parseInt(recentResult.rows[0].recent_uploads) || 0,
          public_files: parseInt(publicResult.rows[0].public_files) || 0
        }
      };
    } catch (error) {
      logger.error(`❌ Error getting user stats: ${error.message}`);
      throw new Error("Failed to retrieve user statistics");
    }
  },

  // Upload file for authenticated user
  uploadUsersFile: async (file, userId) => {
    try {
      // Generate unique identifier and secret key for file
      const fileId = crypto.randomBytes(8).toString("hex");
      const secretKey = crypto.randomBytes(16).toString("hex");
      const s3Key = `user-${userId}/${fileId}-${file.originalname}`;

      // Upload file based on storage type
      if (storageConfig.type === 'LOCAL') {
        // Use local storage
        await localStorage.uploadFile(file, s3Key);
        console.log(`✅ File uploaded to local storage: ${s3Key}`);
      } else {
        // Upload file to R2/S3
        const params = {
          Bucket: storageConfig.bucketName,
          Key: s3Key,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(params));
        console.log(`✅ File uploaded to R2: ${s3Key}`);
      }

      // Save to database
      const result = await query(
        `INSERT INTO filevault_files_authed (user_id, filename, s3_key, file_size, file_type, secret_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [userId, file.originalname, s3Key, file.size, file.mimetype, secretKey]
      );

      return {
        file_id: result.rows[0].id,
        file_name: file.originalname,
        file_size: file.size,
        file_type: file.mimetype,
      };
    } catch (error) {
      logger.error(`❌ Error uploading user file: ${error.message}`, { stack: error.stack });
      throw new Error("Failed to upload file");
    }
  },
};

module.exports = FileService;
