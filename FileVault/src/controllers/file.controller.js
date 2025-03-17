const { s3Client } = require("../config/s3");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const pool = require("../config/db");
const crypto = require('crypto');
const multer = require("multer");

// Use crypto instead of nanoid
function generateId(length) {
  return crypto.randomBytes(Math.ceil(length/2))
    .toString('hex')
    .slice(0, length);
}

function generateSecretKey() {
  return crypto.randomBytes(16).toString('hex');
}

const upload = multer({ storage: multer.memoryStorage() });

exports.uploadMiddleware = upload.single('file');

exports.uploadFile = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileId = generateId(10);
    const secretKey = generateSecretKey();
    const fileName = `${fileId}-${file.originalname}`;
    const bucket = process.env.AWS_BUCKET_NAME;
    const region = process.env.AWS_REGION || "eu-north-1";

    // Upload file to S3 using AWS SDK v3
    const params = {
      Bucket: bucket,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    // Upload using AWS SDK v3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    
    // Generate the file URL
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;

    // Save metadata to database - fixed the SQL typo (INFO -> INTO)
    await pool.query(
      `
        INSERT INTO files(filename, s3_key, secret_key, file_id, file_url)
        VALUES($1, $2, $3, $4, $5)
      `,
      [file.originalname, fileName, secretKey, fileId, fileUrl]
    );

    res.status(201).json({
      message: "File uploaded successfully",
      data: {
        file_id: fileId,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        url: fileUrl,
        secret_key: secretKey,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Upload failed", message: error.message });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const { file_id, secret_key } = req.body;

    if (!file_id || !secret_key) {
      return res.status(400).json({ error: "Missing file_id or secret_key" });
    }

    // Fetch file details from DB
    const result = await pool.query(
      `SELECT * FROM files WHERE file_id = $1 AND secret_key = $2`,
      [file_id, secret_key]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Invalid file_id or secret_key" });
    }
    const fileData = result.rows[0];

    // Generate a signed URL for the file using AWS SDK v3
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileData.s3_key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.status(200).json({
      message: "File download URL generated",
      data: {
        file_id: fileData.file_id,
        file_name: fileData.filename,
        url: signedUrl,
      },
    });
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).json({ error: "Download failed", message: error.message });
  }
};