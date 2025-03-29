const { s3Client } = require("../config/s3");
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
            const command = new GetObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: file.s3_key,
            });

            const url = await getSignedUrl(s3Client, command, {
              expiresIn: 3600,
            });

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
        `SELECT id, filename, s3_key, is_public, user_id 
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
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileData.s3_key,
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
            Bucket: process.env.AWS_BUCKET_NAME,
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

  // Upload file for authenticated user
  uploadUsersFile: async (file, userId) => {
    try {
      // Generate unique identifier and secret key for file
      const fileId = crypto.randomBytes(8).toString("hex");
      const secretKey = crypto.randomBytes(16).toString("hex");
      const s3Key = `user-${userId}/${fileId}-${file.originalname}`;

      // Upload file to S3
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      await s3Client.send(new PutObjectCommand(params));

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
      logger.error(`❌ Error uploading user file: ${error.message}`);
      throw new Error("Failed to upload file");
    }
  },
};

module.exports = FileService;
