const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

// Register route
router.post("/signup", authController.register);

// Login route
router.post("/login", authController.login);

// Email verification route
router.post("/verify-email", authController.verifyEmail);

// Password reset request route
router.post("/forgot-password", authController.forgotPassword);

// Reset password route
router.post("/reset-password", authController.resetPassword);

// Resend verification email route
router.post("/resend-verification", authController.resendVerification);

module.exports = router;
