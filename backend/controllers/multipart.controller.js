const MultipartService = require("../services/multipart.service");

const MultipartController = {
  initiate: async (req, res) => {
    try {
      const { filename, content_type, total_size } = req.body;
      if (!filename) {
        return res.status(400).json({ success: false, message: "filename is required" });
      }
      const result = await MultipartService.initiateUpload({
        userId: req.user.id,
        filename,
        contentType: content_type,
        totalSize: total_size ? Number(total_size) : undefined,
      });
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to initiate upload" });
    }
  },

  partUrl: async (req, res) => {
    try {
      const { s3_key, upload_id, part_number } = req.body;
      const upload = await MultipartService.getPendingUpload(req.user.id, upload_id);
      if (!upload) {
        return res.status(404).json({ success: false, message: "Upload not found" });
      }
      const result = await MultipartService.generatePartPresignedUrl({
        s3Key: upload.s3_key,
        uploadId: upload_id,
        partNumber: part_number,
      });
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to generate part URL" });
    }
  },

  complete: async (req, res) => {
    try {
      const { upload_id, parts } = req.body;
      const upload = await MultipartService.getPendingUpload(req.user.id, upload_id);
      if (!upload) {
        return res.status(404).json({ success: false, message: "Upload not found" });
      }
      const result = await MultipartService.completeUpload({
        s3Key: upload.s3_key,
        uploadId: upload_id,
        parts,
      });
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to complete upload" });
    }
  },

  abort: async (req, res) => {
    try {
      const { upload_id } = req.body;
      const upload = await MultipartService.getPendingUpload(req.user.id, upload_id);
      if (!upload) {
        return res.status(404).json({ success: false, message: "Upload not found" });
      }
      const result = await MultipartService.abortUpload({
        s3Key: upload.s3_key,
        uploadId: upload_id,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to abort upload" });
    }
  },
};

module.exports = MultipartController;
