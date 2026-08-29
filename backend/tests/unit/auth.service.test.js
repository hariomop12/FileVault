jest.mock('nodemailer');
jest.mock('../../utils/logger');
jest.mock('../../config/db', () => require('../../__mocks__/db'));
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn().mockImplementation((size) => {
    const buf = Buffer.alloc(size);
    for (let i = 0; i < size; i++) buf[i] = (i * 17) % 256;
    return buf;
  }),
  randomUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

const AuthService = require('../../services/auth.service');
const { query, __setMockRows, __setMockResponses, __clearMock } = require('../../config/db');
const bcrypt = require('bcryptjs');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearMock();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      process.env.NODE_ENV = 'development';
      __setMockResponses([
        { rows: [] },
        { rows: [{ id: 1, name: 'John', email: 'john@test.com', verification_token: 'abc123' }] },
      ]);

      const result = await AuthService.registerUser('John', 'john@test.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.user.name).toBe('John');
      expect(result.user.email).toBe('john@test.com');
      expect(result.verificationToken).toBeDefined();
    });

    it('should return error when email already exists', async () => {
      __setMockRows([{ id: 1, email: 'john@test.com' }]);

      const result = await AuthService.registerUser('John', 'john@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User already exists');
      expect(result.statusCode).toBe(409);
    });

    it('should hash the password before inserting', async () => {
      __setMockResponses([
        { rows: [] },
        { rows: [{ id: 1, name: 'John', email: 'john@test.com', verification_token: 'abc123' }] },
      ]);
      const bcryptSpy = jest.spyOn(bcrypt, 'hash');

      await AuthService.registerUser('John', 'john@test.com', 'password123');

      expect(bcryptSpy).toHaveBeenCalledWith('password123', expect.any(String));
    });

    it('should throw error on database failure', async () => {
      query.mockRejectedValueOnce(new Error('DB down'));

      await expect(
        AuthService.registerUser('John', 'john@test.com', 'password123')
      ).rejects.toThrow('Error registering user');
    });
  });

  describe('loginUser', () => {
    const mockUser = {
      id: 1,
      name: 'John',
      email: 'john@test.com',
      password: '$2a$10$mockhash',
      email_verified: true,
    };

    it('should login successfully with valid credentials', async () => {
      __setMockRows([mockUser]);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await AuthService.loginUser('john@test.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('john@test.com');
    });

    it('should fail when email is not found', async () => {
      __setMockRows([]);

      const result = await AuthService.loginUser('unknown@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('should fail with wrong password', async () => {
      __setMockRows([mockUser]);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const result = await AuthService.loginUser('john@test.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('should block login until email is verified', async () => {
      __setMockRows([{ ...mockUser, email_verified: false }]);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await AuthService.loginUser('john@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email not verified');
      expect(result.token).toBeUndefined();
    });

    it('should register new users as unverified', async () => {
      jest.clearAllMocks();
      const insertMock = __setMockResponses([
        { rows: [] },
        { rows: [{ id: 2, name: 'Jane', email: 'jane@test.com', verification_token: 'tok123' }] },
      ]);

      const result = await AuthService.registerUser('Jane', 'jane@test.com', 'password123');

      expect(result.user.email).toBe('jane@test.com');
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('email_verified) VALUES ($1, $2, $3, $4, false)'),
        expect.anything()
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      __setMockRows([{ id: 1, email: 'john@test.com' }]);

      const result = await AuthService.verifyEmail('valid-token');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email verified successfully');
    });

    it('should fail with invalid token', async () => {
      __setMockRows([]);

      const result = await AuthService.verifyEmail('invalid-token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid verification token');
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email for existing user', async () => {
      __setMockRows([{ id: 1, email: 'john@test.com', name: 'John' }]);

      const result = await AuthService.forgotPassword('john@test.com');

      expect(result.success).toBe(true);
    });

    it('should return error for non-existent email', async () => {
      __setMockRows([]);

      const result = await AuthService.forgotPassword('unknown@test.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('No user found with this email');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      __setMockRows([{ id: 1, email: 'john@test.com' }]);

      const result = await AuthService.resetPassword('valid-token', 'newPassword123');

      expect(result.success).toBe(true);
    });

    it('should fail with invalid token', async () => {
      __setMockRows([]);

      const result = await AuthService.resetPassword('invalid-token', 'newPassword123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired token');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification for unverified user', async () => {
      __setMockRows([{ id: 1, email: 'john@test.com', name: 'John' }]);

      const result = await AuthService.resendVerificationEmail('john@test.com');

      expect(result.success).toBe(true);
      expect(result.verificationToken).toBeDefined();
    });

    it('should fail when email is already verified', async () => {
      __setMockRows([]);

      const result = await AuthService.resendVerificationEmail('john@test.com');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email not found or already verified');
    });
  });
});
