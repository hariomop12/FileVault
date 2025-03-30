const { testS3Connection } = require("../config/s3");
const { S3Client } = require("@aws-sdk/client-s3");

// Mock valid credentials first
describe("AWS S3 Connection Test", () => {
  it("should successfully connect to the S3 bucket", async () => {
    const result = await testS3Connection();
    expect(result).toHaveProperty("Contents"); // Ensures S3 responded with some data
  });

  it("should throw an error for invalid credentials", async () => {
    // 🔴 Spy on S3Client and force it to throw an error
    jest.spyOn(S3Client.prototype, "send").mockRejectedValue(new Error("Invalid AWS Credentials"));

    await expect(testS3Connection()).rejects.toThrow("Invalid AWS Credentials");

    // ✅ Restore original behavior after test
    jest.restoreAllMocks();
  });
});
