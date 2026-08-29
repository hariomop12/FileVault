const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();
const { storageConfig } = require("../config/R2");

const CORS_RULES = [
  {
    AllowedOrigins: ["*"],
    AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  },
];

const configureR2Cors = async () => {
  if (storageConfig.type !== "R2") {
    console.log("R2 not configured; skipping CORS setup.");
    return false;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: storageConfig.endpoint,
    credentials: {
      accessKeyId: storageConfig.accessKeyId,
      secretAccessKey: storageConfig.secretAccessKey,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });

  await client.send(
    new PutBucketCorsCommand({
      Bucket: storageConfig.bucketName,
      CORSConfiguration: { CORSRules: CORS_RULES },
    })
  );

  console.log(`CORS rules applied to bucket "${storageConfig.bucketName}".`);
  return true;
};

if (require.main === module) {
  configureR2Cors()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error(`Failed to configure CORS: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { configureR2Cors, CORS_RULES };