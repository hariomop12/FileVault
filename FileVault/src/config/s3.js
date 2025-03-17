const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from the root .env file with explicit path
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

console.log("AWS Region:", process.env.AWS_REGION);
console.log(
  "AWS Access Key:",
  process.env.AWS_ACCESS_KEY_ID ? "Found" : "Missing"
);
console.log(
  "AWS Secret Key:",
  process.env.AWS_SECRET_ACCESS_KEY ? "Found" : "Missing"
);
console.log("AWS Bucket Name:", process.env.AWS_BUCKET_NAME);

// If region is still undefined, set a default
const region = "eu-north-1";
const bucketName = process.env.AWS_BUCKET_NAME;

const s3Client = new S3Client({
  region: region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to test S3 connection using a specific bucket
const testS3Connection = async () => {
  try {
    // Instead of listing all buckets, list objects in the specific bucket
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1, // Just request 1 item to minimize data transfer
    });

    const result = await s3Client.send(command);
    console.log("✅ S3 connection successful");
    console.log(`Connected to bucket: ${bucketName}`);
    return result; // Returning for test verification
  } catch (err) {
    console.log(`❌ S3 connection failed: ${err.message}`);
    throw err;
  }
};

testS3Connection();

module.exports = { s3Client, testS3Connection };
