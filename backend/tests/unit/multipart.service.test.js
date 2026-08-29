jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('../../config/R2', () => require('../../__mocks__/R2-r2'));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/part?x=1'),
}));

const MultipartService = require('../../services/multipart.service');
const { __setMockRows, __clearMock, query } = require('../../config/db');
const { s3Client, storageConfig } = require('../../config/R2');

describe('MultipartService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
    s3Client.send.mockResolvedValue({ UploadId: 'upload-123', Location: 'https://loc', ETag: '"etag"' });
  });

  describe('initiateUpload', () => {
    it('rejects when filename missing', async () => {
      const r = await MultipartService.initiateUpload({ userId: 1 });
      expect(r.error).toBeDefined();
    });

    it('creates a multipart upload and persists it', async () => {
      __setMockRows([{ id: 1 }]);
      const r = await MultipartService.initiateUpload({
        userId: 1,
        filename: 'big-video.mp4',
        contentType: 'video/mp4',
        totalSize: 100 * 1024 * 1024, // 100MB => 13 parts @8MB
      });
      expect(r.upload_id).toBe('upload-123');
      expect(r.part_size).toBeGreaterThan(0);
      expect(r.total_parts).toBeGreaterThan(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO multipart_uploads'),
        expect.any(Array)
      );
    });
  });

  describe('generatePartPresignedUrl', () => {
    it('rejects when fields missing', async () => {
      const r = await MultipartService.generatePartPresignedUrl({});
      expect(r.error).toBeDefined();
    });

    it('returns a presigned URL for a part', async () => {
      const r = await MultipartService.generatePartPresignedUrl({
        s3Key: 'user-1/key',
        uploadId: 'upload-123',
        partNumber: 1,
      });
      expect(r.url).toContain('presigned.example.com');
      expect(r.part_number).toBe(1);
    });
  });

  describe('completeUpload', () => {
    it('rejects when parts missing', async () => {
      const r = await MultipartService.completeUpload({ s3Key: 'k', uploadId: 'u', parts: [] });
      expect(r.error).toBeDefined();
    });

    it('completes with sorted parts and returns location', async () => {
      s3Client.send.mockResolvedValueOnce({ Location: 'https://final', ETag: '"final"' });
      __setMockRows([]);
      const r = await MultipartService.completeUpload({
        s3Key: 'user-1/k',
        uploadId: 'upload-123',
        parts: [
          { PartNumber: 2, ETag: '"b"' },
          { PartNumber: 1, ETag: '"a"' },
        ],
      });
      expect(r.location).toBe('https://final');
    });

    it('marks the upload COMPLETED in DB', async () => {
      s3Client.send.mockResolvedValueOnce({ Location: 'https://final', ETag: '"final"' });
      const r = await MultipartService.completeUpload({
        s3Key: 'k',
        uploadId: 'upload-123',
        parts: [{ PartNumber: 1, ETag: '"a"' }],
      });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'COMPLETED'"),
        ['upload-123']
      );
    });
  });

  describe('abortUpload', () => {
    it('aborts and marks ABORTED', async () => {
      const r = await MultipartService.abortUpload({ s3Key: 'k', uploadId: 'u-1' });
      expect(r.success).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'ABORTED'"),
        ['u-1']
      );
    });
  });
});
