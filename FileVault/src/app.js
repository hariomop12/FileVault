const express = require("express");
const dotenv = require("dotenv");
const fileRoutes = require("./routes/file.routes");
const authRoutes = require("./routes/auth.routes");
const userFileRoutes = require("./routes/userFile.routes");
const cors = require("cors");
const helmet = require("helmet");
const compression = require('compression');
const { apiLimiter, authLimiter } = require("./middlewares/rateLimiting.middleware");

// Load env variables first
dotenv.config();

// Initialize app (THEN use it)
const app = express();

// Middleware (in correct order)
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(apiLimiter);

// Routes
app.get("/", (req, res) => {
  res.send("FileVault API is running");
});

app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1", userFileRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// HTTPS redirect should come BEFORE routes (move this up)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!"
  });
});

module.exports = app;