const { exec } = require('child_process');
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Run migrations before starting the server in production
if (process.env.NODE_ENV === 'production') {
  console.log('Running database migrations...');
  exec('npx dbmate up', (error, stdout, stderr) => {
    if (error) {
      console.error(`Migration error: ${error.message}`);
      // Continue starting the server even if migrations fail
    }
    if (stdout) console.log(`Migration output: ${stdout}`);
    if (stderr) console.error(`Migration stderr: ${stderr}`);
    
    console.log('Starting server after migration attempt');
    startServer();
  });
} else {
  startServer();
}

function startServer() {
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}