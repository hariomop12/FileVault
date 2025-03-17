const express = require("express");
const dotenv = require("dotenv");
const fileRoutes = require("./routes/file.routes");

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/files", fileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
