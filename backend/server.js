const app = require('./app');
const logger = require('./utils/logger');

// Check database connection before starting server
async function checkDatabaseConnection() {
  try {
    const { testConnection } = require('./config/db');
    await testConnection();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Start server with database connection check
async function startServer() {
  if (process.env.DATABASE_URL) {
    console.log('Checking database connection...');
    await checkDatabaseConnection();
  }

  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FileVault server running on port ${PORT} - Hot reload test successful!`);
  });

  // Increase header size limit to prevent 431 errors
  server.maxHeadersCount = 0; // No limit on header count
  server.headersTimeout = 60000; // 60 seconds timeout

  // Start heartbeat/failure-detection daemon (unless explicitly disabled for tests)
  if (!process.env.HEARTBEAT_MONITOR_DISABLED) {
    const { startHeartbeatMonitor } = require('./utils/backgroundJobs');
    startHeartbeatMonitor();
  }

  // Keep this instance's storage node alive (configured via HEARTBEAT_NODE_ID)
  if (process.env.HEARTBEAT_NODE_ID) {
    const { startInstanceHeartbeat } = require('./utils/backgroundJobs');
    const nodeId = parseInt(process.env.HEARTBEAT_NODE_ID, 10);
    if (Number.isInteger(nodeId) && nodeId > 0) {
      startInstanceHeartbeat(nodeId);
    } else {
      logger.warn('Ignoring invalid HEARTBEAT_NODE_ID', { value: process.env.HEARTBEAT_NODE_ID });
    }
  }

  // Start self-healing replicator daemon (unless explicitly disabled for tests)
  if (!process.env.REPLICATOR_DISABLED) {
    const { startReplicator } = require('./utils/backgroundJobs');
    startReplicator();
  }
}

// Initialize the server
startServer();