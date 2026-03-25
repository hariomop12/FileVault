const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const { uploadLimiter } = require("../middlewares/rateLimiting.middleware");

/**
 * @swagger
 * /api/v1/files/upload:
 *   post:
 *     summary: Anonymous file upload
 *     description: Upload a file without authentication (public access)
 *     tags: [Anonymous Files]
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
 *           encoding:
 *             file:
 *               style: form
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
 *                   type: object
 *                   properties:
 *                     file_id:
 *                       type: string
 *                       example: "abc123def456"
 *                     filename:
 *                       type: string
 *                       example: "document.pdf"
 *                     file_size:
 *                       type: integer
 *                       example: 1024000
 *                     file_type:
 *                       type: string
 *                       example: "application/pdf"
 *                     download_url:
 *                       type: string
 *                       example: "https://api.filevault.com/api/v1/files/download"
 *       400:
 *         description: Bad request - file validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/upload", 
    uploadLimiter,  // Add rate limiting to anonymous uploads
    fileController.uploadMiddleware, 
    fileController.uploadFile
    /* 
    #swagger.tags = ['Anonymous Files']
    #swagger.summary = 'Anonymous file upload'
    #swagger.description = 'Upload a file without authentication (public access)'
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['file'] = {
      in: 'formData',
      type: 'file',
      required: true,
      description: 'File to upload (max 5GB)'
    }
    #swagger.responses[200] = {
      description: 'File uploaded successfully',
      schema: { $ref: '#/definitions/ApiResponse' }
    }
    #swagger.responses[400] = {
      description: 'Bad request',
      schema: { $ref: '#/definitions/ErrorResponse' }
    }
    */
  );

/**
 * @swagger
 * /api/v1/files/download:
 *   post:
 *     summary: Anonymous file download
 *     description: Download a file using file ID and secret key
 *     tags: [Anonymous Files]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - file_id
 *               - secret_key
 *             properties:
 *               file_id:
 *                 type: string
 *                 description: Unique file identifier
 *                 example: "abc123def456"
 *               secret_key:
 *                 type: string
 *                 description: Secret key for file access
 *                 example: "xyz789secret"
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
 *                   example: "https://s3.amazonaws.com/bucket/file?X-Amz-Signature=..."
 *                 filename:
 *                   type: string
 *                   example: "document.pdf"
 *                 file_size:
 *                   type: integer
 *                   example: 1024000
 *       400:
 *         description: Invalid file ID or secret key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/download", fileController.downloadFile
    /* 
    #swagger.tags = ['Anonymous Files']
    #swagger.summary = 'Anonymous file download'
    #swagger.description = 'Download a file using file ID and secret key'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        type: 'object',
        required: ['file_id', 'secret_key'],
        properties: {
          file_id: { type: 'string', example: 'abc123def456' },
          secret_key: { type: 'string', example: 'xyz789secret' }
        }
      }
    }
    #swagger.responses[200] = {
      description: 'Download link generated successfully',
      schema: { $ref: '#/definitions/ApiResponse' }
    }
    */
);
  
module.exports = router;