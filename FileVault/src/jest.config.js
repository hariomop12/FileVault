module.exports = {
    testEnvironment: 'node',
    setupFiles: ['./jest.setup.js'],
    testPathIgnorePatterns: ['/node_modules/'],
    testMatch: ['**/*.test.js'],
    verbose: true
  };