const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const pgMonitor = require("pg-monitor");

const logger = require("../utils/logger");

// Configuration for database connection
let poolConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL for external services like Aiven
  const aivenCertPath = path.join(__dirname, "ca-aiven.pem");
  const customCertPath = path.join(__dirname, "ca.pem");
  let sslConfig = true; // Start with simple SSL requirement
  
  // Try to load Aiven CA certificate first, then custom certificate
  try {
    let sslCert = null;
    let certSource = "";
    
    if (fs.existsSync(aivenCertPath)) {
      sslCert = fs.readFileSync(aivenCertPath, "utf8");
      certSource = "Aiven official";
    } else if (fs.existsSync(customCertPath)) {
      sslCert = fs.readFileSync(customCertPath, "utf8");
      certSource = "custom";
    }
    
    if (sslCert) {
      sslConfig = {
        ca: sslCert,
        rejectUnauthorized: true  // Use proper SSL validation with correct certificate
      };
      logger.info(`✅ Using ${certSource} CA certificate for database SSL connection`);
    } else {
      logger.info("🔒 Using default SSL settings for database connection");
    }
  } catch (error) {
    logger.warn("⚠️ SSL certificate load failed, using simple SSL mode:", error.message);
    sslConfig = { rejectUnauthorized: false };
  }
  
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 20000,
    ssl: sslConfig
  };
} else {
  // Fallback to individual environment variables
  poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 20000,
    ssl: false
  };
}

const pool = new Pool(poolConfig);

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





 