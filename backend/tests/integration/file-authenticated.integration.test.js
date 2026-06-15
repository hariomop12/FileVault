jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('../../config/R2', () => require('../../__mocks__/R2-r2'));
jest.mock('../../services/localStorage.service');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-presigned-url.com/file.pdf'),
}));

jest.mock('../../middlewares/auth.middleware', () => {
  return (req, res, next) => {
    req.user = { id: 1, email: 'test@test.com' };
    next();
  };
});

const request = require('supertest');
const app = require('../../app');
const { query, __setMockRows, __clearMock } = require('../../config/db');

describe('Authenticated File API - Integration', () => {
  const authToken = 'test-token';

  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
  });

  describe('POST /api/v1/upload', () => {
    it('should upload a file for authenticated user', async () => {
      __setMockRows([{ id: 1 }]);

      const res = await request(app)
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('file content'), 'doc.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/v1/files', () => {
    it('should list user files', async () => {
      __setMockRows([
        { id: 1, filename: 'doc.pdf', file_type: 'application/pdf', file_size: 1024, is_public: false, s3_key: 'user-1/doc.pdf', created_at: '2025-01-01T00:00:00Z' },
      ]);

      const res = await request(app)
        .get('/api/v1/files')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/files/count', () => {
    it('should return file count', async () => {
      __setMockRows([{ total_files: '3' }]);

      const res = await request(app)
        .get('/api/v1/files/count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.total_files).toBe(3);
    });
  });

  describe('GET /api/v1/files/:id', () => {
    it('should get file metadata', async () => {
      __setMockRows([
        { id: 1, filename: 'doc.pdf', file_type: 'application/pdf', file_size: 1024, is_public: false, s3_key: 'user-1/doc.pdf', created_at: '2025-01-01T00:00:00Z', access_token: null },
      ]);

      const res = await request(app)
        .get('/api/v1/files/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 404 for non-existent file', async () => {
      __setMockRows([]);

      const res = await request(app)
        .get('/api/v1/files/999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/download/:id', () => {
    it('should generate download link', async () => {
      __setMockRows([{ id: 1, filename: 'doc.pdf', s3_key: 'user-1/doc.pdf', user_id: 1 }]);

      const res = await request(app)
        .get('/api/v1/download/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/files/:id/share', () => {
    it('should create shareable link', async () => {
      __setMockRows([{ id: 1 }]);

      const res = await request(app)
        .post('/api/v1/files/1/share')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/files/:id', () => {
    it('should delete a file', async () => {
      __setMockRows([{ s3_key: 'user-1/doc.pdf' }]);

      const res = await request(app)
        .delete('/api/v1/files/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('File deleted successfully');
    });
  });

  describe('GET /api/v1/storage', () => {
    it('should return storage usage', async () => {
      __setMockRows([{ total_storage_used: '1048576' }]);

      const res = await request(app)
        .get('/api/v1/storage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.storage_limit).toBe(2147483648);
    });
  });

  describe('GET /api/v1/stats', () => {
    it('should return user stats', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ total_storage_used: '2097152', total_files: '3' }] })
        .mockResolvedValueOnce({ rows: [{ category: 'Documents', count: '2', size: '1048576' }] })
        .mockResolvedValueOnce({ rows: [{ recent_uploads: '1' }] })
        .mockResolvedValueOnce({ rows: [{ public_files: '0' }] });

      const res = await request(app)
        .get('/api/v1/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.overview).toBeDefined();
      expect(res.body.data.file_types).toBeDefined();
      expect(res.body.data.activity).toBeDefined();
    });
  });
});
