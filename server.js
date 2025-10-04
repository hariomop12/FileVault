const app = require('./app');
const logger = require('./utils/logger');

// Check database connection before starting server
async function checkDatabaseConnection() {
  try {
    const { Pool } = require('pg');
    const testPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });
    
    await testPool.query('SELECT 1');
    console.log('✅ Database connection successful');
    await testPool.end();
    return true;
  } catch (error) {
    console.log(`❌ DB connection failed: ${error.message}`);
    return false;
  }
}

// Start server with database connection check
async function startServer() {
  if (process.env.DATABASE_URL) {
    console.log('Checking database connection...');
    await checkDatabaseConnection();
  }
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FileVault server running on port ${PORT} - Hot reload test successful!`);
  });
}

// Initialize the server
startServer();