// Add this to your file.controller.integration.test.js
jest.mock("../services/file.service", () => {
  return {
    uploadUsersFile: jest.fn().mockResolvedValue({
      file_id: "mock-file-id-123",
      file_name: "test.txt",
      url: "https://test-bucket.s3.amazonaws.com/test.txt",
    }),
    getUserFiles: jest.fn().mockResolvedValue({
      files: [
        {
          id: 1,
          file_id: "mock-file-id-123",
          filename: "test.txt",
          file_type: "text/plain",
          file_size: 123,
          created_at: new Date().toISOString(),
        },
      ],
    }),
    getFileById: jest.fn().mockResolvedValue({
      file: {
        id: 1,
        file_id: "mock-file-id-123",
        filename: "test.txt",
        file_type: "text/plain",
        file_size: 123,
        created_at: new Date().toISOString(),
      },
    }),
    getDownloadLink: jest.fn().mockResolvedValue({
      file_id: "mock-file-id-123",
      file_name: "test.txt",
      download_url:
        "https://test-bucket.s3.eu-north-1.amazonaws.com/mock-signed-url",
    }),
    deleteFile: jest.fn().mockResolvedValue({
      success: true,
    }),
    createShareableLink: jest.fn().mockResolvedValue({
      share_id: "mock-share-id",
      url: "https://filevault.com/s/mock-share-id",
    }),
  };
});
jest.mock("../config/db", () => require("../__mocks__/db"));

const request = require("supertest");
const app = require("../app");
const { pool } = require("../config/db");

// Mock S3 client
jest.mock("../config/s3", () => {
  const mockS3Client = {
    send: jest.fn().mockImplementation(() => Promise.resolve({})),
    config: {
      requestHandler: {
        metadata: {
          endpointProvider: () => ({
            url: new URL("https://test-bucket.s3.eu-north-1.amazonaws.com"),
          }),
        },
      },
    },
  };

  return {
    s3Client: mockS3Client,
  };
});

// Mock getSignedUrl function
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest
    .fn()
    .mockResolvedValue(
      "https://test-bucket.s3.eu-north-1.amazonaws.com/mock-signed-url"
    ),
}));

// Mock FileService
jest.mock("../services/file.service", () => {
  return {
    uploadUsersFile: jest.fn().mockResolvedValue({
      file_id: "mock-file-id-123",
      file_name: "test.txt",
    }),
    getUserFiles: jest.fn().mockResolvedValue({
      files: [
        {
          id: 1,
          file_id: "mock-file-id-123",
          filename: "test.txt",
        },
      ],
    }),
    getFileById: jest.fn().mockResolvedValue({
      file: {
        id: 1,
        file_id: "mock-file-id-123",
        filename: "test.txt",
      },
    }),
    getDownloadLink: jest.fn().mockResolvedValue({
      file_id: "mock-file-id-123",
      file_name: "test.txt",
      download_url: "https://mock-download-url.com",
    }),
    deleteFile: jest.fn().mockResolvedValue({
      success: true,
    }),
  };
});

// Mock auth middleware
jest.mock("../middlewares/auth.middleware", () => {
  return (req, res, next) => {
    // Inject a fake authenticated user
    req.user = { id: 1, email: "test@example.com" };
    next();
  };
});

describe("File Controller Integration Tests", () => {
  const authToken = "fake-test-token";

  afterAll(async () => {
    await pool.end();
  });

  test("should upload and retrieve a file", async () => {
    // 1. Upload a test file
    const uploadRes = await request(app)
      .post("/api/v1/upload")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("file", Buffer.from("test content"), "test.txt");

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);

    const fileId = "mock-file-id-123"; // Use a consistent mock ID

    // 2. Retrieve the file metadata
    const getRes = await request(app)
      .get(`/api/v1/files/${fileId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(getRes.status).toBe(200);

    // 3. Get a download link
    const downloadRes = await request(app)
      .get(`/api/v1/download/${fileId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(downloadRes.status).toBe(200);

    // 4. Delete the file
    const deleteRes = await request(app)
      .delete(`/api/v1/files/${fileId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(deleteRes.status).toBe(200);
  });
});
