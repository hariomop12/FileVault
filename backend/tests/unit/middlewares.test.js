jest.mock('../../utils/logger');

describe('Auth Middleware', () => {
  let authMiddleware;
  let req, res, next;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    authMiddleware = require('../../middlewares/auth.middleware');
  });

  it('should reject when no authorization header', () => {
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied. No token provided.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject when token is missing after Bearer', () => {
    req.headers.authorization = 'Bearer ';

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject invalid token', () => {
    req.headers.authorization = 'Bearer invalid-token';

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid token.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass valid token and set req.user', () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: 1, email: 'test@test.com' }, 'test-secret');
    req.headers.authorization = `Bearer ${token}`;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(1);
  });
});

describe('Validation Middleware', () => {
  let validateFileUpload;
  let req, res, next;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    validateFileUpload = require('../../middlewares/validation.middleware').validateFileUpload;
  });

  it('should pass when no file is present', () => {
    validateFileUpload(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject files exceeding size limit', () => {
    req.file = {
      size: 6000 * 1024 * 1024,
      mimetype: 'application/pdf',
      originalname: 'huge.pdf',
    };

    validateFileUpload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept any file type', () => {
    req.file = {
      size: 1024,
      mimetype: 'application/x-sh',
      originalname: 'script.sh',
    };

    validateFileUpload(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should accept any extension', () => {
    req.file = {
      size: 1024,
      mimetype: 'application/pdf',
      originalname: 'document.exe',
    };

    validateFileUpload(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should pass valid file', () => {
    req.file = {
      size: 1024,
      mimetype: 'application/pdf',
      originalname: 'document.pdf',
    };

    validateFileUpload(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
