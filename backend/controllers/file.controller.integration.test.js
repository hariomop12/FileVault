jest.mock("../utils/logger");
jest.mock("../config/db", () => require("../__mocks__/db"));
jest.mock("../config/R2", () => require("../__mocks__/R2-r2"));
jest.mock("../services/localStorage.service");

jest.mock("../middlewares/auth.middleware", () => {
  return (req, res, next) => {
    req.user = { id: 1, email: "test@example.com" };
    next();
  };
});

jest.mock("../services/file.service", () => {
  return {
    uploadUsersFile: jest.fn().mockResolvedValue({
      file_id: "mock-file-id-123",
      file_name: "test.txt",
      file_size: 12,
      file_type: "text/plain",
    }),
    getUserFiles: jest.fn().mockResolvedValue({
      files: [
        {
          id: 1,
          filename: "test.txt",
          file_type: "text/plain",
          file_size: 12,
          created_at: new Date().toISOString(),
        },
      ],
    }),
    getFileById: jest.fn().mockResolvedValue({
      file: {
        id: 1,
        filename: "test.txt",
        file_type: "text/plain",
        file_size: 12,
        created_at: new Date().toISOString(),
      },
    }),
    getDownloadLink: jest.fn().mockResolvedValue({
      file_id: 1,
      file_name: "test.txt",
      download_url: "https://mock-download-url.com",
    }),
    deleteFile: jest.fn().mockResolvedValue({ success: true }),
    createShareableLink: jest.fn().mockResolvedValue({
      file_id: 1,
      shareable_link: "http://localhost:3001/shared/mock-token",
    }),
    getUserStorage: jest.fn().mockResolvedValue({
      total_storage_used: 1048576,
      storage_limit: 2147483648,
      storage_used_mb: 1,
      storage_limit_mb: 2048,
      percentage_used: 0,
    }),
    getUserFileCount: jest.fn().mockResolvedValue({ total_files: 5 }),
    getUserStats: jest.fn().mockResolvedValue({
      overview: { total_files: 5 },
      file_types: [],
      activity: { recent_uploads_7d: 1, public_files: 0 },
    }),
  };
});

const request = require("supertest");
const app = require("../app");
const { pool } = require("../config/db");

describe("File Controller - Full Integration", () => {
  const authToken = "test-token";

  afterAll(async () => {
    await pool.end();
  });

  test("should upload and retrieve a file", async () => {
    const uploadRes = await request(app)
      .post("/api/v1/upload")
      .set("Authorization", `Bearer ${authToken}`)
      .attach("file", Buffer.from("test content"), "test.txt");

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);

    const getRes = await request(app)
      .get("/api/v1/files/1")
      .set("Authorization", `Bearer ${authToken}`);

    expect(getRes.status).toBe(200);

    const downloadRes = await request(app)
      .get("/api/v1/download/1")
      .set("Authorization", `Bearer ${authToken}`);

    expect(downloadRes.status).toBe(200);

    const deleteRes = await request(app)
      .delete("/api/v1/files/1")
      .set("Authorization", `Bearer ${authToken}`);

    expect(deleteRes.status).toBe(200);
  });
});
