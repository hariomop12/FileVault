const { Pool } = require("pg"); // PostgreSQL Pool
const { query } = require("../config/db");
const logger = require("../utils/logger");

// ✅ Mock PostgreSQL Pool
jest.mock("pg", () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
    on: jest.fn(), // ❗ Fix: Mocking 'on' event handler
  };
  return { Pool: jest.fn(() => mPool) };
});

describe("Database Query Tests", () => {
  let pgPool;

  beforeAll(() => {
    pgPool = new Pool(); // Mocked Pool
  });

  it("should return mock data for SELECT query", async () => {
    pgPool.query.mockResolvedValue({ rows: [{ id: 1, name: "Test User" }] });

    const res = await query("SELECT * FROM users WHERE id = $1", [1]);
    expect(res.rows).toEqual([{ id: 1, name: "Test User" }]);
  });

  it("should throw an error for invalid query", async () => {
    pgPool.query.mockRejectedValue(new Error("Syntax error"));

    await expect(query("INVALID QUERY")).rejects.toThrow("Syntax error");
  });
});
