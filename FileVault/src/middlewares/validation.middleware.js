const logger = require("../utils/logger");

// Configure for file validation
const FILE_SIZE_LIMIT = 5000 * 1024 * 1024; // 5GB
const ALLOWED_FILE_TYPES = {
  // Images
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",

  // Documents
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",

  // Archives
  "application/zip": ".zip",
  "application/x-rar-compressed": ".rar",
  "application/x-7z-compressed": ".7z",

  // Text
  "text/plain": ".txt",
  "text/csv": ".csv",
  "text/html": ".html",

  // Media
  "audio/mpeg": ".mp3",
  "video/mp4": ".mp4",
};

/**
 * * Middleware to validate file upload
 * - Check file size against maximum limit
 * - Check file type against allowed types
 */

const validateFileUpload = (req, res, next) => {
  try {
    // Check if there is file to validate
    if (!req.file) {
      return next(); // No file, Continue (Controller will handle this)
    }

    const file = req.file;
    const fileSize = file.size; // in bytes
    const fileType = file.mimetype; // e.g. image/jpeg
    const fileName = file.originalname;

    logger.info(`Validating file: ${fileName} (${fileSize} bytes, ${fileType}`);

    // 1 Check file size

    if (fileSize > FILE_SIZE_LIMIT) {
      logger.warn(`File Size Exceeded: ${fileName} (${fileSize} bytes)`);
      return res.status(400).json({
        success: false,
        message: `File size exceeds the limit of ${
          FILE_SIZE_LIMIT / (1024 * 1024)
        } MB`,
      });
    }

    // 2. Validate file type
    if (!ALLOWED_FILE_TYPES[fileType]) {
      logger.worn(`Invalid File Type: ${fileName} (${fileType})`);
      return res.status(400).json({
        success: false,
        message: `Invalid file type. Allowed types are: ${Object.keys(
          ALLOWED_FILE_TYPES
        ).join(", ")}`,
      });
    }

    // 3. Validate file extension matches content type
    const fileExtension = "." + fileName.split(".").pop().toLowerCase();
    const expectedExtension = ALLOWED_FILE_TYPES[fileType];

    if (fileExtension !== expectedExtension) {
      logger.warn(`File extension mismatch: ${fileName} (${fileType})`);
      return res.status(400).json({
        success: false,
        message: `File extension doesn't match content type. Expected: ${expectedExtension}`,
      });
    }
    logger.info(`File validation passed: ${fileName}`);
    next();
  } catch (error) {
    logger.error(`❌ File validation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "File validation failed",
    });
  }
};

module.exports = { validateFileUpload, ALLOWED_FILE_TYPES, FILE_SIZE_LIMIT };
