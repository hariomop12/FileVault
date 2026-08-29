jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('../../config/R2', () => require('../../__mocks__/R2-r2'));
jest.mock('../../services/localStorage.service');

jest.mock('../../middlewares/auth.middleware', () => {
  return (req, res, next) => {
    req.user = { id: 1, email: 'test@test.com', role: 'USER' };
    next();
  };
});

const request = require('supertest');
const app = require('../../app');
const { __clearMock } = require('../../config/db');

describe('Prometheus Metrics API - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
  });

  it('exposes /metrics in Prometheus text exposition format', async () => {
    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.headers['content-type']).toContain('0.0.4');
    expect(res.text).toContain('# HELP file_upload_total');
    expect(res.text).toContain('# HELP file_download_total');
    expect(res.text).toContain('# HELP http_requests_total');
    expect(res.text).toContain('# HELP storage_nodes_by_status');
    expect(res.text).toContain('# HELP files_under_replicated');
    expect(res.text).toContain('# TYPE process_cpu_seconds_total counter');
  });

  it('tracks real HTTP traffic in http_requests_total', async () => {
    await request(app).get('/api/v1/files').set('Authorization', 'Bearer test-token');

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total{method="GET",route="/files",status="200"}');
  });
});