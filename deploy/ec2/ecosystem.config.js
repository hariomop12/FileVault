// pm2 process definition for FileVault backend on EC2
// Start:  pm2 start deploy/ec2/ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: "filevault-backend",
      script: "server.js",
      cwd: "/opt/filevault/app/backend",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "700M",
      autorestart: true,
      watch: false,
      merge_logs: true,
      out_file: "/var/log/filevault/backend-out.log",
      error_file: "/var/log/filevault/backend-error.log",
      time: true,
    },
  ],
};