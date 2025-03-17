const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const fileRoutes = require("./routes/file.routes");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// app.get('/metrics', metrics);
app.use("/api/files", fileRoutes);

 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
