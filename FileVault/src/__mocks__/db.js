// src/__mocks__/db.js
const mockPool = {
    query: jest.fn().mockImplementation(() => {
      return Promise.resolve({
        rows: [
          {
            id: 1,
            file_id: 'mock-file-id-123',
            filename: 'test.txt',
            s3_key: 'mock-s3-key',
            file_size: 100,
            file_type: 'text/plain'
          }
        ],
        rowCount: 1
      });
    }),
    end: jest.fn().mockResolvedValue(true)
  };
  
  const query = jest.fn().mockImplementation(() => {
    return Promise.resolve({
      rows: [
        {
          id: 1,
          file_id: 'mock-file-id-123',
          filename: 'test.txt',
          s3_key: 'mock-s3-key',
          file_size: 100,
          file_type: 'text/plain'
        }
      ],
      rowCount: 1
    });
  });
  
  module.exports = {
    pool: mockPool,
    query: query
  };