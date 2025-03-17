const { s3Client } = require("../config/s3");
const { Upload } = require("@aws-sdk/lib-storage");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const pool = require("../config/db");
const multer = require("multer");
const crypto = require("crypto");
const { promisify } = require("util");

const upload = multer({ storage: multer.memoryStorage() });
const randomBytes = promisify(crypto.randomBytes);

exports.uploadFile = async (req, res) => {
  try {
    console.log("Upload request received");
    
    if (!req.file) {
      console.log("No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const uniqueName = `${Date.now()}-${file.originalname}`;
    const secretKey = (await randomBytes(16)).toString("hex");

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: uniqueName,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Remove ACL: "private" as it's causing problems
    };

    console.log("Uploading to S3...");
    const upload = new Upload({
      client: s3Client,
      params: params
    });

    const s3Response = await upload.done();
    console.log("S3 upload successful:", s3Response.Key);

    const result = await pool.query(
      "INSERT INTO files (filename, s3_key, secret_key) VALUES ($1, $2, $3) RETURNING id",
      [file.originalname, s3Response.Key, secretKey]
    );

    const fileId = result.rows[0].id;
    const downloadLink = `${process.env.BASE_URL || 'https://vigilant-bassoon-q7q6ppjvv4g52xj57-5000.app.github.dev'}/api/download/${fileId}`;

    res.json({ downloadLink, secretKey });
  } catch (err) {
    console.error("Full error details:", err);
    res.status(500).json({ error: "AWS S3 Upload Failed", message: err.message });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { key } = req.query;

    // Fetch file metadata from DB
    const result = await pool.query("SELECT * FROM files WHERE id = $1", [id]);

    if (result.rowCount === 0) return res.status(404).json({ error: "File not found" });

    const file = result.rows[0];

    if (file.secret_key !== key) return res.status(403).json({ error: "Invalid secret key" });

    // Generate a signed S3 URL using new AWS SDK v3 method
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.s3_key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });

    res.json({ signedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};