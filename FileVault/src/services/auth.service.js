const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const logger = require("../utils/logger");
const { pool, query } = require("../config/db");
const nodemailer = require("nodemailer");

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const AuthService = {
  // Register a new user
  registerUser: async (name, email, password) => {
    try {
      // Check if user already exists
      const userCheck = await query("SELECT * FROM userss WHERE email = $1", [
        email,
      ]);
      if (userCheck.rows.length > 0) {
        return { error: "User already exists" };
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Insert user into database
      const result = await query(
        "INSERT INTO userss (name, email, password, verification_token) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, email, hashedPassword, verificationToken]
      );

      const user = result.rows[0];

      return {
        success: "User registered successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        verificationToken: user.verification_token,
      };
    } catch (error) {
      logger.error(`❌ Error in AuthService.registerUser: ${error.message}`);
      throw new Error("Error registering user", error.message);
    }
  },

  // Send verification email
  sendVerificationEmail: async (email, name, token) => {
    try {
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const verificationLink = `${baseUrl}/verify-email?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || '"FileVault" <no-reply@filevault.com>',
        to: email,
        subject: "Verify your email address",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4a5568;">Welcome to FileVault!</h2>
              <p>Hello ${name},</p>
              <p>Thank you for registering with FileVault. Please verify your email address to complete your registration.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" 
                   style="background-color:rgb(55, 255, 0); color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 4px; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              
              <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
              <p><a href="${verificationLink}">${verificationLink}</a></p>
              
              <p>This verification link will expire in 24 hours.</p>
              
              <p>If you did not sign up for FileVault, please ignore this email.</p>
              
              <p>Best regards,<br>The FileVault Team</p>
            </div>
          `,
      };
      await transporter.sendMail(mailOptions);
      logger.info(`✔️ Verification email sent to ${email}`);
      return { success: true, message: "Verification email sent" };
    } catch (error) {
      logger.error(
        `❌ Error in AuthService.sendVerificationEmail: ${error.message}`
      );
      throw new Error("Error sending verification email", error.message);
    }
  },

  // Login user
  loginUser: async (email, password) => {
    try {
      // Check if user exists
      const result = await query("SELECT * FROM userss WHERE email = $1", [
        email,
      ]);

      if (result.rows.length === 0) {
        return { error: "Invalid credentials" };
      }

      const user = result.rows[0];

      // Check if email is verified
      if (!user.email_verified) {
        return { error: "Please verify your email before logging in" };
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return { error: "Invalid credentials" };
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      return {
        success: "User logged in successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      };
    } catch (error) {
      logger.error(`❌ Error in AuthService.loginUser: ${error.message}`);
      throw new Error("Error logging in user", error.message);
    }
  },

  // Verify email
  verifyEmail: async (token) => {
    try {
      // Find user with this verification token
      const result = await query(
        "SELECT * FROM userss WHERE verification_token = $1",
        [token]
      );

      if (result.rows.length === 0) {
        return { error: "Invalid verification token" };
      }

      // Update user to verified and clear token
      await query(
        "UPDATE userss SET email_verified = true, verification_token = null WHERE verification_token = $1",
        [token]
      );

      return { success: "Email verified successfully" };
    } catch (error) {
      logger.error(`❌ Error in AuthService.verifyEmail: ${error.message}`);
      throw new Error("Error verifying email", error.message);
    }
  },

  // Request password reset
  forgotPassword: async (email) => {
    try {
      // Check if user exists
      const result = await query("SELECT * FROM userss WHERE email = $1", [
        email,
      ]);

      if (result.rows.length === 0) {
        return { error: "No user found with this email" };
      }

      const user = result.rows[0];

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString("hex");

      // Save reset token to database
      await query(
        "UPDATE userss SET verification_token = $1 WHERE email = $2",
        [resetToken, email]
      );

      // Send password reset email
      await AuthService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken
      );
      return { success: "Password reset email sent" };
    } catch (error) {
      logger.error(`❌ Error in AuthService.forgotPassword: ${error.message}`);
      throw new Error("Error requesting password reset", error.message);
    }
  },

  // Send password reset email
  sendPasswordResetEmail: async (email, name, token) => {
    try {
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const resetLink = `${baseUrl}/reset-password?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || '"FileVault" <no-reply@filevault.com>',
        to: email,
        subject: "Reset your password",
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4a5568;">Reset Your Password</h2>
            <p>Hello ${name},</p>
            <p>We received a request to reset your password for your FileVault account. If you didn't make this request, you can safely ignore this email.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color:rgb(41, 240, 27); color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 4px; font-weight: bold;">
                Reset Your Password
              </a>
            </div>
            
            <p>If the button above doesn't work, you can also copy and paste the following link into your browser:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            
            <p>This password reset link will expire in 1 hour.</p>
            
            <p>Best regards,<br>The FileVault Team</p>
          </div>
            `,
      };
      await transports.sendMail(mailOptions);
      logger.info(`✔️ Password reset email sent to ${email}`);
      return { success: true, message: "Password reset email sent" };
    } catch (error) {
      logger.error(
        `❌ Error in AuthService.sendPasswordResetEmail: ${error.message}`
      );
      throw new Error("Error sending password reset email", error.message);
    }
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    try {
      // check token is exists
      const result = await query(
        "SELECT * FROM userss WHERE verification_token = $1",
        [token]
      );

      if (result.rows.length === 0) {
        return { error: "Invalid or expired token" };
      }

      // Hash Newpassword
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password and clear token
      await query(
        "UPDATE userss SET password = $1, verification_token = null WHERE verification_token = $2",
        [hashedPassword, token]
      );

      return { success: "Password reset successfully" };
    } catch (error) {
      logger.error(`❌ Error in AuthService.resetPassword: ${error.message}`);
      throw new Error("Error resetting password");
    }
  },

  // Resend verification email
  resendVerificationEmail: async (email) => {
    try {
      // Check if user exists and is not verified
      const result = await query(
        "SELECT * FROM userss WHERE email = $1 AND email_verified = false",
        [email]
      );
      if (result.rows.length === 0) {
        return { error: "Email not found or already verified" };
      }

      const user = result.rows[0];

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");

      // Update verification token in database

      await query(
        `
            UPDATE userss
            SET verification_token = $1
            WHERE email = $2
        `,
        [verificationToken, email]
      );

      // Send verification email
      await AuthService.sendVerificationEmail(
        user.email,
        user.name,
        verificationToken
      );
      return {
        success: "Verification email sent",
        varificationToken: verificationToken,
      };
    } catch (error) {
      logger.error(
        `❌ Error in AuthService.resendVerificationEmail: ${error.message}`
      );
      throw new Error("Error resending verification email");
    }
  },
};

module.exports = AuthService;
