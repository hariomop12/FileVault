jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('../../config/R2', () => require('../../__mocks__/R2-r2'));
jest.mock('../../services/localStorage.service');

jest.mock('../../middlewares/auth.middleware', () => {
  return (req, res, next) => {
    req.user = { id: 1, email: 'admin@test.com', role: 'ADMIN' };
    next();
  };
});

const request = require('supertest');
const app = require('../../app');
const { __setMockRows, __clearMock } = require('../../config/db');

describe('Storage Node API - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
  });

  describe('GET /api/v1/admin/nodes', () => {
    it('returns the list of storage nodes (admin)', async () => {
      __setMockRows([
        { id: 1, name: 'local-default', type: 'LOCAL', status: 'ACTIVE' },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/nodes')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });
  });

  describe('POST /api/v1/admin/nodes', () => {
    it('registers a new node (admin)', async () => {
      __setMockRows([
        { id: 2, name: 'r2-node', type: 'R2', status: 'ACTIVE' },
      ]);

      const res = await request(app)
        .post('/api/v1/admin/nodes')
        .set('Authorization', 'Bearer admin-token')
        .send({ name: 'r2-node', type: 'R2', endpoint: 'https://r2.example' });

      expect(res.status).toBe(201);
      expect(res.body.node.name).toBe('r2-node');
    });
  });

  describe('GET /api/v1/admin/nodes/ring', () => {
    it('builds a ring from active nodes', async () => {
      __setMockRows([
        { id: 1, name: 'A', type: 'LOCAL', status: 'ACTIVE' },
        { id: 2, name: 'B', type: 'R2', status: 'ACTIVE' },
        { id: 3, name: 'C', type: 'R2', status: 'ACTIVE' },
      ]);

      const res = await request(app)
        .get('/api/v1/admin/nodes/ring')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.activeNodes).toBe(3);
    });
  });

  describe('POST /api/v1/admin/nodes/:id/heartbeat', () => {
    it('records a heartbeat and revives the node (admin)', async () => {
      __setMockRows([
        { id: 7, name: 'hello-node', status: 'ACTIVE', last_heartbeat_at: new Date().toISOString() },
      ]);

      const res = await request(app)
        .post('/api/v1/admin/nodes/7/heartbeat')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.node.id).toBe(7);
    });

    it('returns 404 for an unknown node', async () => {
      __setMockRows([]);

      const res = await request(app)
        .post('/api/v1/admin/nodes/999/heartbeat')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(404);
    });
  });
});
