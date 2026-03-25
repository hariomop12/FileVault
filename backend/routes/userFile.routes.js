const express = require("express");
const router = express.Router();
const UserFileController = require("../controllers/file.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { validateFileUpload } = require('../middlewares/validation.middleware');
const { uploadLimiter, createEndpointLimiter } = require('../middlewares/rateLimiting.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Upload file (Authenticated)
 *     description: Upload a file to authenticated user's account
 *     tags: [User Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (max 5GB)
 *               is_public:
 *                 type: boolean
 *                 description: Make file publicly accessible
 *                 default: false
 *               folder_path:
 *                 type: string
 *                 description: Folder path for organization
 *                 default: "/"
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "File uploaded successfully"
 *                 file:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         description: File validation error
 *       401:
 *         description: Unauthorized - invalid token
 *       413:
 *         description: File too large
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  "/upload",
  uploadLimiter, // Rate limit for file uploads
  UserFileController.uploadMiddleware,
  validateFileUpload,
  UserFileController.uploadFilee
);

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     summary: Get user's files
 *     description: Retrieve all files belonging to the authenticated user
 *     tags: [User Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of files per page
 *       - in: query
 *         name: folder_path
 *         schema:
 *           type: string
 *         description: Filter by folder path
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search files by filename
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get("/files", UserFileController.getUserFiles);

/**
 * @swagger
 * /api/v1/files/count:
 *   get:
 *     summary: Get user's total file count
 *     description: Retrieve the total number of files uploaded by the authenticated user
 *     tags: [User Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_files:
 *                       type: integer
 *                       description: Total number of files
 *                       example: 42
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get("/files/count", UserFileController.getFileCount);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   get:
 *     summary: Get file metadata
 *     description: Get detailed information about a specific file
 *     tags: [User Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     responses:
 *       200:
 *         description: File metadata retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 file:
 *                   $ref: '#/components/schemas/File'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - not file owner
 *       404:
 *         description: File not found
 *       429:
 *         description: Rate limit exceeded
 */
router.get(
    "/files/:id", 
    createEndpointLimiter(20, 1),  // 20 requests per minute
    UserFileController.getFileMetadata
  );

/**
 * @swagger
 * /api/v1/download/{id}:
 *   get:
 *     summary: Get download link
 *     description: Generate a secure download link for the file
 *     tags: [User Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     responses:
 *       200:
 *         description: Download link generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 download_url:
 *                   type: string
 *                   description: Presigned S3 download URL (expires in 1 hour)
 *                 filename:
 *                   type: string
 *                 expires_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - not file owner
 *       404:
 *         description: File not found
 */
router.get("/download/:id", UserFileController.getDownloadLink);

/**
 * @swagger
 * /api/v1/files/{id}:
 *   delete:
 *     summary: Delete file
 *     description: Permanently delete a file from storage and database
 *     tags: [User Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "File deleted successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - not file owner
 *       404:
 *         description: File not found
 */
router.delete("/files/:id", UserFileController.deleteFile);

/**
 * @swagger
 * /api/v1/files/{id}/share:
 *   post:
 *     summary: Create shareable link
 *     description: Generate a shareable link for the file with optional expiration
 *     tags: [User Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: File ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiry_hours:
 *                 type: integer
 *                 description: Hours until link expires (default 24)
 *                 default: 24
 *                 minimum: 1
 *                 maximum: 8760
 *               password:
 *                 type: string
 *                 description: Optional password protection
 *               download_limit:
 *                 type: integer
 *                 description: Maximum number of downloads allowed
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Shareable link created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 share_link:
 *                   type: string
 *                   example: "https://api.filevault.com/shared/abc123def456"
 *                 access_token:
 *                   type: string
 *                   description: Access token for the shared link
 *                 expires_at:
 *                   type: string
 *                   format: date-time
 *                   description: When the link expires
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - not file owner
 *       404:
 *         description: File not found
 */
router.post("/files/:id/share", UserFileController.createShareableLink);

/**
 * @swagger
 * /api/v1/storage:
 *   get:
 *     summary: Get user's storage usage
 *     description: Retrieve the authenticated user's total storage used and remaining quota (2GB free limit)
 *     tags: [User Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_storage_used:
 *                       type: integer
 *                       description: Total storage used in bytes
 *                       example: 524288000
 *                     storage_limit:
 *                       type: integer
 *                       description: Storage limit in bytes (2GB)
 *                       example: 2147483648
 *                     storage_used_mb:
 *                       type: integer
 *                       description: Storage used in MB
 *                       example: 500
 *                     storage_limit_mb:
 *                       type: integer
 *                       description: Storage limit in MB
 *                       example: 2048
 *                     percentage_used:
 *                       type: integer
 *                       description: Percentage of storage used
 *                       example: 25
 *                     remaining_storage:
 *                       type: integer
 *                       description: Remaining storage in bytes
 *                       example: 1624293648
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get("/storage", UserFileController.getStorage);

/**
 * @swagger
 * /api/v1/stats:
 *   get:
 *     summary: Get comprehensive user statistics
 *     description: Retrieve detailed statistics about the user's files including storage usage, file type breakdown, and activity metrics
 *     tags: [User Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         total_files:
 *                           type: integer
 *                           example: 42
 *                         total_storage_used:
 *                           type: integer
 *                           description: Storage used in bytes
 *                           example: 524288000
 *                         storage_limit:
 *                           type: integer
 *                           description: Storage limit in bytes
 *                           example: 2147483648
 *                         storage_used_mb:
 *                           type: integer
 *                           example: 500
 *                         storage_limit_mb:
 *                           type: integer
 *                           example: 2048
 *                         percentage_used:
 *                           type: integer
 *                           example: 25
 *                         remaining_storage:
 *                           type: integer
 *                           example: 1624293648
 *                     file_types:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                             example: "Images"
 *                           count:
 *                             type: integer
 *                             example: 15
 *                           size:
 *                             type: integer
 *                             description: Size in bytes
 *                             example: 209715200
 *                           size_mb:
 *                             type: integer
 *                             example: 200
 *                     activity:
 *                       type: object
 *                       properties:
 *                         recent_uploads_7d:
 *                           type: integer
 *                           description: Files uploaded in last 7 days
 *                           example: 5
 *                         public_files:
 *                           type: integer
 *                           description: Number of public files
 *                           example: 3
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.get("/stats", UserFileController.getStats);

module.exports = router;
