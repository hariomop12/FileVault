jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));

const request = require('supertest');
const app = require('../../app');
const { query, __setMockRows, __setMockResponses, __clearMock } = require('../../config/db');

describe('Auth API - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
    process.env.NODE_ENV = 'test';
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should register a user successfully', async () => {
      process.env.NODE_ENV = 'development';
      __setMockResponses([
        { rows: [] },
        { rows: [{ id: 1, name: 'John', email: 'john@test.com', verification_token: 'abc123' }] },
      ]);

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ name: 'John', email: 'john@test.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.verificationToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      __setMockRows([{ id: 1, email: 'john@test.com' }]);

      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ name: 'John', email: 'john@test.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('User already exists');
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ name: 'John' });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({ name: 'John', email: 'john@test.com', password: '123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('password123', 10);
      __setMockRows([{
        id: 1, name: 'John', email: 'john@test.com',
        password: hashedPassword, email_verified: true,
      }]);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'john@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('should reject unverified email', async () => {
      const bcrypt = require('bcryptjs');
      __setMockRows([{
        id: 1, name: 'John', email: 'john@test.com',
        password: bcrypt.hashSync('password123', 10), email_verified: false,
      }]);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'john@test.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('should reject invalid credentials', async () => {
      __setMockRows([]);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      __setMockRows([{ id: 1, email: 'john@test.com' }]);

      const res = await request(app)
        .get('/api/v1/auth/verify-email?token=valid-token');

      expect(res.status).toBe(200);
    });

    it('should reject invalid token', async () => {
      __setMockRows([]);

      const res = await request(app)
        .get('/api/v1/auth/verify-email?token=invalid-token');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should process forgot password', async () => {
      __setMockRows([{ id: 1, email: 'john@test.com', name: 'John' }]);

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'john@test.com' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      __setMockRows([{ id: 1, email: 'john@test.com' }]);

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'valid-token', password: 'newPass123' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/resend-verification', () => {
    it('should resend for unverified user', async () => {
      __setMockRows([{ id: 1, email: 'john@test.com', name: 'John' }]);

      const res = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'john@test.com' });

      expect(res.status).toBe(200);
    });

    it('should reject when already verified', async () => {
      __setMockRows([]);

      const res = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'verified@test.com' });

      expect(res.status).toBe(400);
    });
  });
});
