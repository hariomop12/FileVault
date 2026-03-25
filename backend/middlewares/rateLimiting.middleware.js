const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

// Custom rate limit exceeded handler with logging

const rateLimitExceededHandler = (req, res) => {
  const ip = req.ip || req.header["x-forwarded-for"] || "unknown IP";
  logger.warn(`Rate limit exceeded for IP: ${ip}, route: ${req.originalUrl}`);

  res.status(429).json({
    success: false,
    message: "Too many requests, please try again later.",
    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
  });
};

// General API rate limiter (100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 10000, // 15 minutes
  max: 1000, // max 1000 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: rateLimitExceededHandler,
  skip: (req) => req.ip === "127.0.0.1",
  keyGenerator: (req) => req.ip || req.headers["x-forwarded-for"] || "unknown",
});

// Authentication endpoints limiter (more strict: 10 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 auth attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitExceededHandler,
  skipSuccessfulRequests: false, // Don't skip even if request succeeds
  skip: (req) => req.ip === "127.0.0.1" || req.ip === "::1", // Skip rate limiting for localhost
  keyGenerator: (req) => req.ip || req.headers["x-forwarded-for"] || "unknown",
});

// File upload limiter (5 uploads per minute)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 uploads per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitExceededHandler,
  keyGenerator: (req) => {
    // If authenticated, use user ID + IP, otherwise just IP
    return req.user
      ? `${req.user.id}-${req.ip}`
      : req.ip || req.headers["x-forwarded-for"] || "unknown";
  },
});

// Endpoint-specific configurable limiter
const createEndpointLimiter = (maxRequests, timeWindowMinutes) => {
  return rateLimit({
    windowMs: timeWindowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitExceededHandler,
    keyGenerator: (req) => {
      return req.user
        ? `${req.user.id}-${req.ip}`
        : req.ip || req.headers["x-forwarded-for"] || "unknown";
    },
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  createEndpointLimiter,
};
