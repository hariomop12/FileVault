const logger = require("../utils/logger");

// Configure for file validation
const FILE_SIZE_LIMIT = 5000 * 1024 * 1024; // 5GB

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

module.exports = { validateFileUpload, FILE_SIZE_LIMIT };
