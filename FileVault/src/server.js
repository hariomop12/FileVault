const { exec } = require('child_process');
const app = require('./app'); // Add this line to import your app!

// Logger if you have one
const logger = require('./utils/logger');

if (process.env.DATABASE_URL) {
  console.log('Running database migrations...');
  exec('dbmate up', (error, stdout, stderr) => {
    if (error) {
      console.error(`Migration error: ${error.message}`);
      // Continue starting the server even if migrations fail
    }
    if (stdout) console.log(`Migration output: ${stdout}`);
    if (stderr) console.error(`Migration stderr: ${stderr}`);
    
    startServer();
  });
} else {
  console.log('No DATABASE_URL found, skipping migrations');
  startServer();
}

function startServer() {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}