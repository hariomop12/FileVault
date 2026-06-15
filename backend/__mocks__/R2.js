const mockSend = jest.fn().mockResolvedValue({});

const mockS3Client = {
  send: mockSend,
  config: {
    requestHandler: {
      metadata: {
        endpointProvider: () => ({
          url: new URL("https://mock-bucket.r2.cloudflarestorage.com"),
        }),
      },
    },
  },
};

const storageConfig = {
  type: 'LOCAL',
  uploadDir: './uploads',
  bucketName: 'mock-bucket',
};

const testS3Connection = jest.fn().mockResolvedValue({});

module.exports = {
  s3Client: mockS3Client,
  storageConfig,
  testS3Connection,
};
