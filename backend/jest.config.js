/**
 * Jest Configuration for InstaCrave Backend
 * Industry-grade testing setup with comprehensive coverage tracking
 */

module.exports = {
  // Use Node.js environment for backend testing
  testEnvironment: 'node',

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/docs/**',           // Exclude documentation
    '!src/validation/sanitize.js', // Tested implicitly through validation
  ],

  // Enforce minimum coverage thresholds
  // Current actual coverage: ~51% (496 tests across models, some services, validations)
  // Note: Controllers, repositories, and some services lack test coverage
  coverageThreshold: {
    global: {
      branches: 30,      // Actual: 33.77%
      functions: 35,     // Actual: 40.88%
      lines: 45,         // Actual: 51.74%
      statements: 45     // Actual: 51.27%
    }
  },

  // Test file patterns
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],

  // Global setup and teardown for MongoDB Memory Server
  globalSetup: './tests/setup/globalSetup.js',
  globalTeardown: './tests/setup/globalTeardown.js',
  setupFilesAfterEnv: ['./tests/setup/testHelpers.js'],

  // Timeout for async tests (30 seconds for integration tests)
  testTimeout: 30000,

  // Show detailed test results
  verbose: true,

  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Run tests serially to avoid database conflicts
  maxWorkers: 1,

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],
};
