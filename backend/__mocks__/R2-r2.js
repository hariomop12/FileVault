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
  type: 'R2',
  region: 'auto',
  endpoint: 'https://mock.r2.cloudflarestorage.com',
  bucketName: 'mock-bucket',
  accessKeyId: 'mock-key',
  secretAccessKey: 'mock-secret',
};

const testS3Connection = jest.fn().mockResolvedValue({});

module.exports = {
  s3Client: mockS3Client,
  storageConfig,
  testS3Connection,
};
