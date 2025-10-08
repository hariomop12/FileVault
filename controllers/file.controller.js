const { s3Client } = require("../config/R2");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { pool, query } = require("../config/db");
const crypto = require("crypto");
const multer = require("multer");
const FileService = require("../services/file.service");
const logger = require("../utils/logger");
const { FILE_SIZE_LIMIT } = require("../middlewares/validation.middleware");

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_SIZE_LIMIT, // 5 GB
  },
});

exports.uploadMiddleware = upload.single("file");

const handleControllerError = (error, operation, res) => {
  const errorId = crypto.randomBytes(4).toString("hex");
  logger.error(`❌ Error ${operation} [${errorId}]: ${error.message}`, {
    errorId,
    stack: error.stack,
    operation,
  });

  // Always return the response
  return res.status(500).json({
    success: false,
    message: `Failed to ${operation}`,
    errorId, // Include to help trace errors in logs
  });
};

const sendResponse = (res, statusCode, success, message, data = null) => {
  const response = {
    success,
    message,
    ...(data && { data }),
  };
  return res.status(statusCode).json(response);
};

// Anonymous File Upload
exports.uploadFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileId = generateId(10);
    const secretKey = generateSecretKey();
    const fileName = `${fileId}-${file.originalname}`;
    const bucket = process.env.R2_BUCKET_NAME;
   

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
    const fileUrl = `${process.env.R2_ENDPOINT}/${fileName}`;

    // Save metadata to database - fixed the SQL typo (INFO -> INTO)
    await pool.query(
      `
        INSERT INTO files(filename, s3_key, secret_key, file_id, file_url)
        VALUES($1, $2, $3, $4, $5)
      `,
      [file.originalname, fileName, secretKey, fileId, fileUrl]
    );
    const result = {
      file_id: fileId,
      secret_key: secretKey,
      file_name: file.originalname,
      url: fileUrl
    };
    sendResponse(res, 201, true, "File uploaded successfully", result);
  } catch (error) {
    return handleControllerError(error, "upload file", res);
  }
};

// Anonymous File Download
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
      Bucket: process.env.R2_BUCKET_NAME,
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
      return handleControllerError(error, "upload file", res);
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
      return res.status(500).json({
        success: false,
        message: "Failed to create shareable link",
      });
    }
  },

  // Get user storage usage
  getStorage: async (req, res) => {
    try {
      const userId = req.user.id;
      console.log(`Getting storage for user ID: ${userId}`);

      const result = await FileService.getUserStorage(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`❌ Error getting user storage: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve storage information",
      });
    }
  },

  // Get user file count
  getFileCount: async (req, res) => {
    try {
      const userId = req.user.id;
      console.log(`Getting file count for user ID: ${userId}`);

      const result = await FileService.getUserFileCount(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`❌ Error getting user file count: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve file count",
      });
    }
  },

  // Get comprehensive user statistics
  getStats: async (req, res) => {
    try {
      const userId = req.user.id;
      console.log(`Getting stats for user ID: ${userId}`);

      const result = await FileService.getUserStats(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`❌ Error getting user stats: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve user statistics",
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
