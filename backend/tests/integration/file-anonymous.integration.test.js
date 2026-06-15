jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('../../config/R2', () => require('../../__mocks__/R2-r2'));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-presigned-url.com/file.pdf'),
}));

const request = require('supertest');
const app = require('../../app');
const { query, __clearMock } = require('../../config/db');

describe('Anonymous File API - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
  });

  describe('POST /api/v1/files/upload', () => {
    it('should upload a file anonymously', async () => {
      const res = await request(app)
        .post('/api/v1/files/upload')
        .attach('file', Buffer.from('test content'), 'hello.txt');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.file_id).toBeDefined();
      expect(res.body.data.secret_key).toBeDefined();
    });

    it('should reject when no file is attached', async () => {
      const res = await request(app)
        .post('/api/v1/files/upload');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/files/download', () => {
    it('should generate download URL for valid file_id and secret_key', async () => {
      query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          filename: 'hello.txt',
          s3_key: 'anonymous/abc123-hello.txt',
          file_id: 'abc123',
          secret_key: 'secret123',
        }],
        rowCount: 1,
      });

      const res = await request(app)
        .post('/api/v1/files/download')
        .send({ file_id: 'abc123', secret_key: 'secret123' });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const res = await request(app)
        .post('/api/v1/files/download')
        .send({ file_id: 'wrong', secret_key: 'wrong' });

      expect(res.status).toBe(404);
    });
  });
});
