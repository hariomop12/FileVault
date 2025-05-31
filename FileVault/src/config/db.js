const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const pgMonitor = require("pg-monitor");

const sslCertPath = path.join(__dirname,"ca.pem");
const sslCert = fs.readFileSync(sslCertPath, "utf8");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const logger = require("../utils/logger");
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 20000,
  ssl: {
    ca: sslCert,
    rejectUnauthorized: true
  }
});

// 📊 Monitor Database Queries (for Development)
if (process.env.NODE_ENV === "development") {
  pgMonitor.attach(pool);
  pgMonitor.setLog((msg, info) => {
    logger.info(`📊 DB QUERY: ${msg}`);
  });
}

// 🚨 Handle Pool Errors
pool.on("error", (err) => {
  logger.error(`❌ Unexpected error on idle client: ${err}`);
  process.exit(-1);
});

// ✅ **Test DB Connection**
if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      const client = await pool.connect();
      console.log("✅ DB connection successful");
      client.release();
    } catch (err) {
      console.log(`❌ DB connection failed: ${err.message}`);
    }
  })();
}


// 🛠️ Export DB Query Function with Logging
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`✅ Executed query: ${text}, Duration: ${duration}ms`);
    return res;
  } catch (err) {
    logger.error(`❌ Query Failed: ${text}, Error: ${err.message}`, { stack: err.stack });
    throw err; // Ensure the error is properly thrown
  }
};

module.exports = { pool, query };





 