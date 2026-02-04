# Backend Testing Guide

## Overview

Testing suite using Jest, Supertest, and MongoDB Memory Server for unit and integration tests.

## Running Tests

```bash
# Install dependencies (if not already installed)
npm install

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Verbose output for debugging
npm run test:verbose
```

## 📁 Test Structure

```
tests/
├── setup/                      # Global test configuration
│   ├── globalSetup.js          # MongoDB Memory Server initialization
│   ├── globalTeardown.js       # Cleanup after all tests
│   └── testHelpers.js          # Shared factories and utilities
├── unit/                       # Unit tests (isolated components)
│   ├── models/                 # Model validation and methods
│   ├── services/               # Service layer logic
│   ├── utils/                  # Utility functions
│   └── middlewares/            # Middleware behavior
├── integration/                # Integration tests (end-to-end flows)
│   ├── auth.integration.test.js
│   ├── food.integration.test.js
│   ├── order.integration.test.js
│   └── security.integration.test.js
└── fixtures/                   # Test data samples
```

## Test Structure

### Integration Tests (`integration/`)
Complete end-to-end flows testing API endpoints:

- **auth.integration.test.js** - Registration, login, sessions
- **food.integration.test.js** - Food CRUD operations
- **food-v1.test.js** - V1 API endpoints
- **food-v2.test.js** - V2 API with advanced filtering
- **food-partner-extended.test.js** - Partner features
- **food-partner-food.test.js** - Partner food management
- **order.integration.test.js** - Order flows
- **search.test.js** - Search functionality
- **security.integration.test.js** - CSRF, CORS, sanitization
- **user.test.js** - User profile operations

### Unit Tests (`unit/`)
Isolated component testing:

- **middlewares/** - CORS, rate limiting, query validation
- **models/** - Database model validation and methods
- **services/** - Business logic services
- **utils/** - Helper functions

## Test Helpers

Available in all tests via `testHelpers.js`:

```javascript
// Create test data
const user = await createTestUser({ email: 'test@example.com' });
const partner = await createTestFoodPartner();
const food = await createTestFood(partner);
const order = await createTestOrder(user, partner, food);

// Generate auth tokens
const { accessToken, refreshToken } = generateAuthTokens(userId, 'user');

// Create session
const session = await createTestSession(userId, 'User', refreshToken);

// Extract cookies
const token = extractCookie(response, 'accessToken');
```

## Coverage

Current test coverage (496 tests passing):

- Statements: 51%
- Branches: 30%
- Functions: 35%
- Lines: 51%

Key areas with good coverage:
- Models: 100%
- Validation schemas: 100%
- Authentication flows: 85%
- Food operations: 75%

Areas needing improvement:
- Controllers: 0% (tested via integration tests)
- Repositories: 0% (tested via integration tests)

### 1. AAA Pattern (Arrange-Act-Assert)
```javascript
it('should verify correct password', async () => {
  // Arrange
  const user = await createTestUser({ password: 'test123' });
  
  // Act
  const isValid = await user.verifyPassword('test123');
  
  // Assert
  expect(isValid).toBe(true);
});
```

### 2. Descriptive Test Names
✅ Good: `should reject login with invalid password`  
❌ Bad: `test password`

### 3. Test Isolation
- Each test is independent
- Database cleared after each test (`afterEach` in testHelpers.js)
- No shared state between tests

### 4. Mock External Dependencies
```javascript
beforeEach(() => {
  mockImageKitUpload(); // Mock file uploads
});
```

### 5. Test Edge Cases
```javascript
it('should handle empty password', async () => {
## Running Specific Tests

```bash
# Single test file
npm test -- tests/unit/models/user.model.test.js

# Single test suite
npm test -- -t "User Model"

# Single test
npm test -- -t "should hash password before saving"

# Verbose output
npm run test:verbose
```

## Troubleshooting

**Tests timing out:**
Increase timeout in jest.config.js or specific test:
```javascript
jest.setTimeout(30000); // 30 seconds
```

**MongoDB Memory Server fails:**
```bash
rm -rf ~/.cache/mongodb-memory-server
npm install mongodb-memory-server --save-dev
```

**Flaky tests:**
- Ensure proper test isolation
- Add `await` to all async operations
- Use `afterEach` cleanup properly

- [Jest Documentation](https://jestjs.io/)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Testing Best Practices](https://testingjavascript.com/)

## 🎓 What You'll Learn

By working with this test suite:

1. **Test-Driven Development (TDD)** - Write tests first, then code
2. **Mocking & Stubbing** - Isolate units under test
3. **Integration Testing** - Test complete workflows
4. **Coverage Analysis** - Measure test effectiveness
5. **CI/CD** - Automated testing pipelines
6. **Debugging** - Find and fix bugs quickly
7. **Professional Standards** - Industry-grade testing practices

## 🔮 Roadmap

### Completed ✅
- Jest configuration
- Global test setup (MongoDB Memory Server)
- Test helpers and factories
- Unit tests for models (user, foodpartner, food, order)
- Unit tests for services (token)
- Unit tests for utilities (response)
- Integration tests for authentication
- Integration tests for food operations
- CI/CD with GitHub Actions

### In Progress ⏳
- Middleware unit tests
- Remaining utility tests
- Order integration tests
- Security integration tests

### Planned 📋
- Performance benchmarking
- Load testing
- E2E tests for critical flows
- Visual regression testing (frontend)
- Contract testing (API stability)

---

**Happy Testing! 🎉**

For questions or issues, please refer to the main project README or create an issue on GitHub.
