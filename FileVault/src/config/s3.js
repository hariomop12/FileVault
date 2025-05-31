const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Validate Required AWS Variables
if (!process.env.AWS_REGION || !process.env.AWS_BUCKET_NAME || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("❌ Missing required AWS environment variables.");
}

// Hide sensitive logs
console.log("AWS Region:", process.env.AWS_REGION);
console.log("AWS Credentials Loaded:", process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? "✅ Yes" : "❌ No");

// Create S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to test S3 connection
const testS3Connection = async () => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_NAME,
      MaxKeys: 1,
    });

    const result = await s3Client.send(command);
    console.log("✅ S3 connection successful");
    return result;
  } catch (err) {
    console.log(`❌ S3 connection failed: ${err.message}`);
    throw err;
  }
};

// Run connection test only if file is executed directly
if (require.main === module) {
  testS3Connection();
}

module.exports = { s3Client, testS3Connection };
