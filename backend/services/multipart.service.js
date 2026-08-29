const { s3Client, storageConfig } = require("../config/R2");
const {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl: presign } = require("@aws-sdk/s3-request-presigner");
const { query } = require("../config/db");
const crypto = require("crypto");
const logger = require("../utils/logger");

const DEFAULT_PART_SIZE = 8 * 1024 * 1024; // 8 MB

const MultipartService = {
  requiresS3() {
    if (storageConfig.type !== "R2") {
      return { error: "Multipart upload requires an S3-compatible store (R2). Local storage does not support multipart." };
    }
    return null;
  },

  async initiateUpload({ userId, filename, contentType, totalSize }) {
    const reqErr = this.requiresS3();
    if (reqErr) return reqErr;
    if (!filename) return { error: "filename is required" };

    const fileId = crypto.randomBytes(8).toString("hex");
    const s3Key = `user-${userId}/${fileId}-${filename.replace(/[^\w.\-]/g, "_")}`;

    const partSize = totalSize
      ? Math.ceil(Math.min(totalSize, DEFAULT_PART_SIZE))
      : DEFAULT_PART_SIZE;
    const totalParts = totalSize
      ? Math.max(1, Math.ceil(totalSize / partSize))
      : 0;

    const cmd = new CreateMultipartUploadCommand({
      Bucket: storageConfig.bucketName,
      Key: s3Key,
      ContentType: contentType || "application/octet-stream",
    });

    const response = await s3Client.send(cmd);
    const uploadId = response.UploadId;

    await query(
      `INSERT INTO multipart_uploads (user_id, s3_key, upload_id, filename, content_type, total_size, part_size, total_parts, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
       RETURNING id`,
      [userId, s3Key, uploadId, filename, contentType || "application/octet-stream", totalSize || 0, partSize, totalParts]
    );

    return {
      file_key: s3Key,
      upload_id: uploadId,
      part_size: partSize,
      total_parts: totalParts,
      bucket: storageConfig.bucketName,
    };
  },

  async generatePartPresignedUrl({ s3Key, uploadId, partNumber, expiresIn = 3600 }) {
    const reqErr = this.requiresS3();
    if (reqErr) return reqErr;
    if (!s3Key || !uploadId || !partNumber) {
      return { error: "s3Key, uploadId and partNumber are required" };
    }
    const cmd = new UploadPartCommand({
      Bucket: storageConfig.bucketName,
      Key: s3Key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    const url = await presign(s3Client, cmd, { expiresIn });
    return { url, part_number: partNumber, expires_in: expiresIn };
  },

  async completeUpload({ s3Key, uploadId, parts }) {
    const reqErr = this.requiresS3();
    if (reqErr) return reqErr;
    if (!s3Key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return { error: "s3Key, uploadId and non-empty parts array are required" };
    }

    const sortedParts = parts
      .map((p) => ({ PartNumber: Number(p.PartNumber), ETag: p.ETag }))
      .sort((a, b) => a.PartNumber - b.PartNumber);

    const cmd = new CompleteMultipartUploadCommand({
      Bucket: storageConfig.bucketName,
      Key: s3Key,
      UploadId: uploadId,
      MultipartUpload: { Parts: sortedParts },
    });

    const response = await s3Client.send(cmd);
    const location = response.Location || "";

    await query(
      "UPDATE multipart_uploads SET status = 'COMPLETED', updated_at = NOW() WHERE upload_id = $1",
      [uploadId]
    );

    return { location, s3_key: s3Key, e_tag: response.ETag };
  },

  async abortUpload({ s3Key, uploadId }) {
    const reqErr = this.requiresS3();
    if (reqErr) return reqErr;
    if (!s3Key || !uploadId) return { error: "s3Key and uploadId are required" };

    await s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: storageConfig.bucketName,
        Key: s3Key,
        UploadId: uploadId,
      })
    );

    await query(
      "UPDATE multipart_uploads SET status = 'ABORTED', updated_at = NOW() WHERE upload_id = $1",
      [uploadId]
    );

    return { success: true, message: "Upload aborted" };
  },

  async getPendingUpload(userId, uploadId) {
    const result = await query(
      "SELECT * FROM multipart_uploads WHERE upload_id = $1 AND user_id = $2",
      [uploadId, userId]
    );
    return result.rows.length ? result.rows[0] : null;
  },
};

module.exports = MultipartService;
