const mockRows = [];
let mockRowCount = 0;
let mockResponses = [];

const mockQuery = jest.fn().mockImplementation((text, params) => {
  if (mockResponses.length > 0) {
    const resp = mockResponses.shift();
    return Promise.resolve(resp);
  }
  return Promise.resolve({
    rows: [...mockRows],
    rowCount: mockRowCount,
  });
});

const mockPool = {
  connect: jest.fn().mockResolvedValue({
    release: jest.fn(),
    query: mockQuery,
  }),
  query: mockQuery,
  end: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

const __setMockRows = (rows) => {
  mockRows.length = 0;
  mockRows.push(...rows);
  mockRowCount = rows.length;
};

const __setMockResponses = (responses) => {
  mockResponses = responses.map((r) => ({
    rows: r.rows || [],
    rowCount: r.rowCount || (r.rows ? r.rows.length : 0),
  }));
};

const __clearMock = () => {
  mockRows.length = 0;
  mockRowCount = 0;
  mockResponses = [];
  mockQuery.mockClear();
  mockPool.connect.mockClear();
  mockPool.end.mockClear();
};

module.exports = {
  pool: mockPool,
  query: mockQuery,
  testConnection: jest.fn().mockResolvedValue(true),
  __setMockRows,
  __setMockResponses,
  __clearMock,
};
