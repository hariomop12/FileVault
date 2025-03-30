 
const express = require("express");
const dotenv = require("dotenv");
const fileRoutes = require("./routes/file.routes");
const authRoutes = require("./routes/auth.routes");
const userFileRoutes = require("./routes/userFile.routes");
const cors = require("cors");
const helmet = require("helmet");
const { apiLimiter, authLimiter } = require("./middlewares/rateLimiting.middleware");
const compression = require('compression');
app.use(compression());
dotenv.config();

 
const app = express();

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(apiLimiter);

app.get("/", (req, res) => {
  res.send("FileVault API is running");
});

// Routes
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/files", fileRoutes);
app.use("/api/v1", userFileRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!"
  });
});

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

module.exports = app;