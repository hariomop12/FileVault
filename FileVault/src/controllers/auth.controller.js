const AuthService = require("../services/auth.service");
const logger = require("../utils/logger");

// Helper function to verify email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const AuthController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Please provide name, email, and password",
        });
      }

      // Validate email format
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long",
        });
      }

      const result = await AuthService.registerUser(name, email, password);
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json({
        success: true,
        message:
          "Registration successful! Please check your email to verify your account.",
        user: result.user,
        // Only include token in development for testing
        ...(process.env.NODE_ENV === "development" && {
          verificationToken: result.verificationToken,
        }),
      });
    } catch (error) {
      logger.error(`Register Controller Error: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, message: "Server error during registration" });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Please provide email and password",
        });
      }

      const result = await AuthService.loginUser(email, password);
      if (!result.success) {
        return res.status(401).json(result);
      }

      res.status(200).json({
        success: true,
        message: "Login successful",
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      logger.error(`Login Controller Error: ${error.message}`);
      res
        .status(500)
        .json({ success: false, message: "Server error during login" });
    }
  },

  // Vefify email
  verifyEmail: async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Verification token is required",
        });
      }
      const result = await AuthService.verifyEmail(token);

      if (!result.success) {
        return res.status(400).json(result);
      }
      res.status(200).json({
        success: true,
        message: "Email verified successfully! You can now log in.",
      });
    } catch (error) {
      logger.error(`Verify Email Controller Error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Server error during email verification process",
      });
    }
  },

  // Request password reset
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const result = await AuthService.forgotPassword(email);

      // Always return success, even if email doesn't exist (security best practice)
      res.status(200).json({
        success: true,
        message:
          "If your email is registered, you will receive password reset instructions",
        // Only include token in development for testing
        ...(process.env.NODE_ENV === "development" &&
          result.success && { resetToken: result.resetToken }),
      });
    } catch (error) {
      logger.error(`Forgot password controller error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: "Server error processing your request",
      });
    }
  },

  // Reset password
  resetPassword: async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: "Token and new password are required",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long",
        });
      }

      const result = await AuthService.resetPassword(token, password);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json({
        success: true,
        message:
          "Password reset successful! You can now log in with your new password.",
      });
    } catch (error) {
      logger.error(`Reset password controller error: ${error.message}`);
      res
        .status(500)
        .json({ success: false, message: "Server error resetting password" });
    }
  },

  // Resend verification email
    resendVerification: async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email is required' 
        });
      }
      
      const result = await AuthService.resendVerificationEmail(email);
      
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      
      res.status(200).json({
        success: true,
        message: 'Verification email has been resent. Please check your inbox.',
        ...(process.env.NODE_ENV === 'development' && { verificationToken: result.verificationToken })
      });
    } catch (error) {
      logger.error(`Resend verification error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Server error processing your request' });
    }
  }
};

module.exports = AuthController;
