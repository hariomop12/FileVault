jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('../../config/R2', () => require('../../__mocks__/R2-r2'));
jest.mock('../../services/localStorage.service');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-presigned-url.com/file.pdf'),
}));

jest.mock('../../middlewares/auth.middleware', () => {
  return (req, res, next) => {
    req.user = { id: 1, email: 'test@test.com', role: 'USER' };
    next();
  };
});

const request = require('supertest');
const app = require('../../app');
const { query, __setMockRows, __clearMock } = require('../../config/db');

describe('Edge Cache Control - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
  });

  it('marks public/shared anonymous downloads as CDN-cacheable', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          filename: 'hello.txt',
          s3_key: 'anonymous/abc123-hello.txt',
          file_id: 'abc123',
          secret_key: 'secret',
        },
      ],
    });

    const res = await request(app)
      .post('/api/v1/files/download')
      .send({ file_id: 'abc123', secret_key: 'secret' });

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    expect(res.headers['cdn-cache-control']).toBe('public, s-maxage=3600');
  });

  it('marks authenticated download links as private no-store (presigned URLs)', async () => {
    __setMockRows([
      { id: 1, filename: 'doc.pdf', s3_key: 'user-1/doc.pdf', user_id: 1, is_public: true },
    ]);

    const res = await request(app)
      .get('/api/v1/download/1')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['cdn-cache-control']).toBe('private, no-store');
  });

  it('surfaces upstream cache outcomes into the /metrics endpoint', async () => {
    await request(app)
      .post('/api/v1/files/download')
      .set('cf-cache-status', 'HIT')
      .send({ file_id: 'abc123', secret_key: 'secret' });

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.text).toContain('cache_requests_total{status="HIT",policy="public"}');
  });
});