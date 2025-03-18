const express = require("express");
const dotenv = require("dotenv");
const fileRoutes = require("./routes/file.routes");
const authRoutes = require("./routes/auth.routes");
const cors = require("cors");
const helmet = require("helmet");

dotenv.config();

const app = express();
app.use(cors()); // Add this line
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World from FileVault API");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
