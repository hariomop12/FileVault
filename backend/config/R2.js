const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
require('dotenv').config();

// Environment variables are loaded by the runtime (docker-compose, node process, etc.)
const hasR2Config = process.env.R2_ENDPOINT &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME;

// Check if R2 credentials are placeholder values
const isPlaceholder = process.env.R2_ENDPOINT?.includes('your-account-id') ||
  process.env.R2_ACCESS_KEY_ID?.includes('your-r2') ||
  process.env.R2_SECRET_ACCESS_KEY?.includes('your-r2') ||
  process.env.R2_BUCKET_NAME?.includes('your-bucket');

const isR2 = hasR2Config && !isPlaceholder;

if (!isR2) {
  console.log("⚠️  R2 storage not configured or using placeholder values.");
  console.log("📁 Using LOCAL FILE STORAGE for development.");
  console.log("💡 To use R2, configure proper credentials in .env file.");
}

// Use R2 if available, otherwise use local storage
const storageConfig = isR2 ? {
  type: 'R2',
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto', // R2 uses 'auto' as region
  bucketName: process.env.R2_BUCKET_NAME,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
} : {
  type: 'LOCAL',
  uploadDir: process.env.LOCAL_UPLOAD_DIR || './uploads',
  bucketName: 'local-storage' // For compatibility
}
// Hide sensitive logs
console.log(`${storageConfig.type} Storage Configuration Loaded: ✅`);
if (storageConfig.type === 'R2') {
  console.log(`${storageConfig.type} Credentials:`, storageConfig.accessKeyId && storageConfig.secretAccessKey ? "✅ Yes" : "❌ No");
}

// Create S3-compatible client only for R2 (not for local storage)
const s3Client = storageConfig.type === 'R2' ? new S3Client({
  region: storageConfig.region,
  endpoint: storageConfig.endpoint,
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey,
  },
  // Force path style for R2 compatibility
  forcePathStyle: true,
  // Additional R2-specific configuration
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
}) : null;

// Function to test storage connection
const testS3Connection = async () => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: storageConfig.bucketName,
      MaxKeys: 1,
    });

    const result = await s3Client.send(command);
    console.log(`✅ ${storageConfig.type} storage connection successful`);
    return result;
  } catch (err) {
    console.log(`❌ ${storageConfig.type} storage connection failed: ${err.message}`);
    throw err;
  }
};

// Run connection test only if file is executed directly
if (require.main === module) {
  testS3Connection();
}

module.exports = { s3Client, testS3Connection, storageConfig };
