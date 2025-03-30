const express = require("express");
const dotenv = require("dotenv");
const fileRoutes = require("./routes/file.routes");
const authRoutes = require("./routes/auth.routes");
const userFileRoutes = require("./routes/userFile.routes");
const cors = require("cors");
const helmet = require("helmet");
const compression = require('compression');
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

// Routes
app.get("/", (req, res) => {
  res.send("FileVault API is running");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP" });
});

app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1", userFileRoutes);

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