const express = require("express");
const dotenv = require("dotenv");
const fileRoutes = require("./routes/file.routes");
const authRoutes = require("./routes/auth.routes");
const userFileRoutes = require("./routes/userFile.routes");
const cors = require("cors");
const helmet = require("helmet");
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const { apiLimiter, authLimiter } = require("./middlewares/rateLimiting.middleware");

// Load env variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(compression());

/**
 * @swagger
 * /:
 *   get:
 *     summary: API Status Check
 *     description: Returns the current status of the FileVault API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "FileVault API is running"
 */
app.get("/", (req, res) => {
  res.json("FileVault API is running");
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health Check
 *     description: Returns the health status of the API and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "UP"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'FileVault API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// Routes - Order matters! Auth routes must come before authenticated routes
app.use("/api/v1/files", fileRoutes);  // Anonymous file routes (no auth)
app.use("/api/v1/auth", authLimiter, authRoutes);  // Auth routes (signup, login, etc.)
app.use("/api/v1", userFileRoutes);  // Authenticated user routes (requires auth)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!"
  });
});

// IMPORTANT: Export the app!
module.exports = app;