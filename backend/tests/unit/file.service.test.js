jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('../../config/R2', () => require('../../__mocks__/R2-r2'));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-presigned-url.com/file.pdf?signature=abc'),
}));

jest.mock('../../services/localStorage.service');

const FileService = require('../../services/file.service');
const { query, __setMockRows, __clearMock } = require('../../config/db');
const { s3Client } = require('../../config/R2');

describe('FileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
  });

  describe('getUserFiles', () => {
    it('should return files with presigned URLs', async () => {
      __setMockRows([
        { id: 1, filename: 'doc.pdf', file_type: 'application/pdf', file_size: 1024, is_public: false, s3_key: 'user-1/doc.pdf', created_at: '2025-01-01T00:00:00Z' },
      ]);

      const result = await FileService.getUserFiles(1);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].filename).toBe('doc.pdf');
      expect(result.files[0].download_url).toBe('https://mock-presigned-url.com/file.pdf?signature=abc');
    });

    it('should return empty array when no files', async () => {
      __setMockRows([]);

      const result = await FileService.getUserFiles(1);

      expect(result.files).toEqual([]);
    });
  });

  describe('getFileById', () => {
    it('should return file metadata', async () => {
      __setMockRows([
        { id: 1, filename: 'doc.pdf', file_type: 'application/pdf', file_size: 1024, is_public: false, s3_key: 'user-1/doc.pdf', created_at: '2025-01-01T00:00:00Z', access_token: null },
      ]);

      const result = await FileService.getFileById(1, 1);

      expect(result.file).toBeDefined();
      expect(result.file.filename).toBe('doc.pdf');
    });

    it('should return error when file not found', async () => {
      __setMockRows([]);

      const result = await FileService.getFileById(999, 1);

      expect(result.error).toBe("File not found or you don't have permission");
    });
  });

  describe('getDownloadLink', () => {
    it('should generate a download link', async () => {
      __setMockRows([
        { id: 1, filename: 'doc.pdf', s3_key: 'user-1/doc.pdf', user_id: 1 },
      ]);

      const result = await FileService.getDownloadLink(1, 1);

      expect(result.download_url).toBeDefined();
      expect(result.file_name).toBe('doc.pdf');
    });

    it('should return error when file not found', async () => {
      __setMockRows([]);

      const result = await FileService.getDownloadLink(999, 1);

      expect(result.error).toBe("File not found or you don't have permission");
    });
  });

  describe('deleteFile', () => {
    it('should delete file from S3 and DB', async () => {
      __setMockRows([{ s3_key: 'user-1/doc.pdf' }]);

      const result = await FileService.deleteFile(1, 1);

      expect(result.success).toBe('File deleted successfully');
      expect(s3Client.send).toHaveBeenCalled();
    });

    it('should return error when file not found', async () => {
      __setMockRows([]);

      const result = await FileService.deleteFile(999, 1);

      expect(result.error).toBe("File not found or you don't have permission");
    });
  });

  describe('createShareableLink', () => {
    it('should create shareable link for owned file', async () => {
      __setMockRows([{ id: 1 }]);

      const result = await FileService.createShareableLink(1, 1);

      expect(result.shareable_link).toBeDefined();
      expect(result.shareable_link).toContain('/shared/');
    });

    it('should return error when file not found', async () => {
      __setMockRows([]);

      const result = await FileService.createShareableLink(999, 1);

      expect(result.error).toBe("File not found or you don't have permission");
    });
  });

  describe('getUserStorage', () => {
    it('should return storage usage with 2GB limit', async () => {
      __setMockRows([{ total_storage_used: '1048576' }]);

      const result = await FileService.getUserStorage(1);

      expect(result.total_storage_used).toBe(1048576);
      expect(result.storage_limit).toBe(2147483648);
      expect(result.storage_used_mb).toBe(1);
    });

    it('should return zero usage when no files', async () => {
      __setMockRows([{ total_storage_used: '0' }]);

      const result = await FileService.getUserStorage(1);

      expect(result.total_storage_used).toBe(0);
      expect(result.percentage_used).toBe(0);
    });
  });

  describe('getUserFileCount', () => {
    it('should return file count', async () => {
      __setMockRows([{ total_files: '5' }]);

      const result = await FileService.getUserFileCount(1);

      expect(result.total_files).toBe(5);
    });

    it('should return zero when no files', async () => {
      __setMockRows([{ total_files: '0' }]);

      const result = await FileService.getUserFileCount(1);

      expect(result.total_files).toBe(0);
    });
  });

  describe('getUserStats', () => {
    it('should return comprehensive stats', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ total_storage_used: '2097152', total_files: '3' }] })
        .mockResolvedValueOnce({ rows: [{ category: 'Documents', count: '2', size: '1048576' }] })
        .mockResolvedValueOnce({ rows: [{ recent_uploads: '1' }] })
        .mockResolvedValueOnce({ rows: [{ public_files: '0' }] });

      const result = await FileService.getUserStats(1);

      expect(result.overview).toBeDefined();
      expect(result.overview.total_files).toBe(3);
      expect(result.file_types).toHaveLength(1);
      expect(result.file_types[0].category).toBe('Documents');
      expect(result.activity).toBeDefined();
    });
  });

  describe('uploadUsersFile', () => {
    it('should upload file successfully with R2', async () => {
      __setMockRows([{ id: 1 }]);
      const file = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test'),
        size: 4,
        mimetype: 'application/pdf',
      };

      const result = await FileService.uploadUsersFile(file, 1);

      expect(result.file_id).toBe(1);
      expect(result.file_name).toBe('test.pdf');
      expect(s3Client.send).toHaveBeenCalled();
    });
  });
});
