const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
require('dotenv').config();

// Environment variables are loaded by the runtime (docker-compose, node process, etc.)
const isR2 = process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME;

if (!isR2) {
  throw new Error("❌ Missing required R2 storage environment variables.");
}

// Use R2 if available, otherwise fallback to AWS
const storageConfig =  {
  type: 'R2',
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto', // R2 uses 'auto' as region
  bucketName: process.env.R2_BUCKET_NAME,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
} 
// Hide sensitive logs
console.log(`${storageConfig.type} Storage Configuration Loaded: ✅`);
console.log(`${storageConfig.type} Credentials:`, storageConfig.accessKeyId && storageConfig.secretAccessKey ? "✅ Yes" : "❌ No");

// Create S3-compatible client (works with both AWS S3 and Cloudflare R2)
const s3Client = new S3Client({
  region: storageConfig.region,
  endpoint: storageConfig.endpoint, // This will be undefined for AWS (which is correct)
  credentials: {
    accessKeyId: storageConfig.accessKeyId,
    secretAccessKey: storageConfig.secretAccessKey,
  },
  // Force path style for R2 compatibility
  forcePathStyle: storageConfig.type === 'R2'
});

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
