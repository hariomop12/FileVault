jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('../../config/R2', () => require('../../__mocks__/R2-r2'));
jest.mock('../../services/localStorage.service');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://presigned.example.com/part'),
}));

jest.mock('../../middlewares/auth.middleware', () => {
  return (req, res, next) => {
    req.user = { id: 1, email: 'test@test.com', role: 'USER' };
    next();
  };
});

const request = require('supertest');
const app = require('../../app');
const { __setMockRows, __clearMock } = require('../../config/db');
const { s3Client } = require('../../config/R2');

describe('Multipart Upload API - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
    s3Client.send.mockResolvedValue({ UploadId: 'mp-111', Location: 'https://loc', ETag: '"etag"' });
  });

  describe('POST /api/v1/user/files/multipart/initiate', () => {
    it('initiates a multipart upload', async () => {
      __setMockRows([{ id: 1 }]);
      const res = await request(app)
        .post('/api/v1/user/files/multipart/initiate')
        .set('Authorization', 'Bearer t')
        .send({ filename: 'big.mp4', content_type: 'video/mp4', total_size: 100000000 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.upload_id).toBe('mp-111');
    });

    it('returns 400 when filename missing', async () => {
      const res = await request(app)
        .post('/api/v1/user/files/multipart/initiate')
        .set('Authorization', 'Bearer t')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/user/files/multipart/part-url', () => {
    it('returns a presigned part URL for a pending upload', async () => {
      __setMockRows([{ s3_key: 'user-1/k', upload_id: 'mp-111' }]);
      const res = await request(app)
        .post('/api/v1/user/files/multipart/part-url')
        .set('Authorization', 'Bearer t')
        .send({ upload_id: 'mp-111', part_number: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toContain('presigned.example.com');
    });

    it('returns 404 for unknown upload', async () => {
      __setMockRows([]);
      const res = await request(app)
        .post('/api/v1/user/files/multipart/part-url')
        .set('Authorization', 'Bearer t')
        .send({ upload_id: 'nope', part_number: 1 });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/user/files/multipart/complete', () => {
    it('completes the upload', async () => {
      s3Client.send.mockResolvedValue({ Location: 'https://final', ETag: '"final"' });
      __setMockRows([{ s3_key: 'user-1/k', upload_id: 'mp-111' }]);
      const res = await request(app)
        .post('/api/v1/user/files/multipart/complete')
        .set('Authorization', 'Bearer t')
        .send({ upload_id: 'mp-111', parts: [{ PartNumber: 1, ETag: '"a"' }] });

      expect(res.status).toBe(200);
      expect(res.body.data.location).toBe('https://final');
    });
  });
});
