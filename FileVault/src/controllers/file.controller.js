const { s3Client } = require("../config/s3");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { pool, query } = require("../config/db");
const crypto = require("crypto");
const multer = require("multer");
const FileService = require("../services/file.service");
const logger = require("../utils/logger");

// Use crypto instead of nanoid
function generateId(length) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

function generateSecretKey() {
  return crypto.randomBytes(16).toString("hex");
}

const upload = multer({ storage: multer.memoryStorage() });

exports.uploadMiddleware = upload.single("file");

exports.uploadFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileId = generateId(10);
    const secretKey = generateSecretKey();
    const fileName = `${fileId}-${file.originalname}`;
    const bucket = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION || "eu-north-1";

    // Upload file to S3 using AWS SDK v3
    const params = {
      Bucket: bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    // Upload using AWS SDK v3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Generate the file URL
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;

    // Save metadata to database - fixed the SQL typo (INFO -> INTO)
    await pool.query(
      `
        INSERT INTO files(filename, s3_key, secret_key, file_id, file_url)
        VALUES($1, $2, $3, $4, $5)
      `,
      [file.originalname, fileName, secretKey, fileId, fileUrl]
    );

    res.status(201).json({
      message: "File uploaded successfully",
      data: {
        file_id: fileId,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        url: fileUrl,
        secret_key: secretKey,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Upload failed", message: error.message });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const { file_id, secret_key } = req.body;

    if (!file_id || !secret_key) {
      return res.status(400).json({ error: "Missing file_id or secret_key" });
    }

    // Fetch file details from DB
    const result = await pool.query(
      `SELECT * FROM files WHERE file_id = $1 AND secret_key = $2`,
      [file_id, secret_key]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Invalid file_id or secret_key" });
    }
    const fileData = result.rows[0];

    // Generate a signed URL for the file using AWS SDK v3
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileData.s3_key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    res.status(200).json({
      message: "File download URL generated",
      data: {
        file_id: fileData.file_id,
        file_name: fileData.filename,
        url: signedUrl,
      },
    });
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ error: "Download failed", message: error.message });
  }
};

const UserFileController = {
  // Multer middleware for file upload
  uploadMiddleware: upload.single("file"),

  // Upload file to S3
  uploadFilee: async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      const userId = req.user.id;
      const result = await FileService.uploadUsersFile(file, userId);

      res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        data: result,
      });
    } catch (error) {
      logger.error(`❌ Upload controller error: ${error.message}`);
      res
        .status(500)
        .json({ success: false, message: "Failed to upload file" });
    }
  },

  getUserFiles: async (req, res) => {
    try {
      const userId = req.user.id;
      console.log(`Getting files for user ID: ${userId}`);

      const result = await FileService.getUserFiles(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`❌ Error getting user files: ${error.message}`);
      console.error(`Error in getUserFiles: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user files",
      });
    }
  },
  // Get file metadata
  getFileMetadata: async (req, res) => {
    try {
      const fileId = req.params.id;
      const userId = req.user.id;

      const result = await FileService.getFileById(fileId, userId);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        data: result.file,
      });
    } catch (error) {
      logger.error(`❌ Get file metadata controller error: ${error.message}`);
      res
        .status(500)
        .json({ success: false, message: "Failed to retrieve file metadata" });
    }
  },

  // Get download link
  getDownloadLink: async (req, res) => {
    try {
      const fileId = req.params.id;
      const userId = req.user.id;

      const result = await FileService.getDownloadLink(fileId, userId);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`❌ Download link controller error: ${error.message}`);
      res
        .status(500)
        .json({ success: false, message: "Failed to generate download link" });
    }
  },

  // Delete file
  deleteFile: async (req, res) => {
    try {
      const fileId = req.params.id;
      const userId = req.user.id;

      const result = await FileService.deleteFile(fileId, userId);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      logger.error(`❌ Delete file controller error: ${error.message}`);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete file" });
    }
  },

  // Create shareable link
  createShareableLink: async (req, res) => {
    try {
      const fileId = req.params.id;
      const userId = req.user.id;

      const result = await FileService.createShareableLink(fileId, userId);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error,
        });
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`❌ Share file controller error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Failed to create shareable link",
      });
    }
  },
};

module.exports = {
  ...UserFileController,
  uploadFile: exports.uploadFile,
  uploadMiddleware: exports.uploadMiddleware,
  downloadFile: exports.downloadFile,
};
