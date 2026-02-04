# InstaCrave Backend Testing Guide

## Overview

Testing suite for InstaCrave backend using Jest, Supertest, and MongoDB Memory Server for isolated integration testing.

## Quick Start

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

## 🧪 Test Categories

### Unit Tests
**Purpose:** Test individual components in isolation

**Coverage:**
- ✅ **Models** (4 files)
  - User model: password hashing, validation, verifyPassword method
  - Food partner model: same as user + followCount management
  - Food model: validation, counters, orderable logic
  - Order model: status flow, relationships, pricing
  
- ✅ **Services** (3 files)
  - Token service: JWT generation, refresh tokens, argon2 hashing
  - Audit service: event logging (unit tests pending)
  - Storage service: mocked ImageKit uploads

- ✅ **Utilities** (5 files)
  - Response utility: standardized API responses
  - Query utility: pagination, filtering, sorting (pending)
  - AppError: custom error class (pending)
  - catchAsync: async error handling (pending)

- ⏳ **Middlewares** (pending)
  - Auth middleware
  - Validation middleware
  - Error middleware

### Integration Tests
**Purpose:** Test complete user flows end-to-end

**Coverage:**
- ✅ **Authentication flows**
  - User registration & login
  - Food partner registration & login
  - Token refresh mechanism
  - Session management
  - Logout and revocation

- ✅ **Food operations**
  - CRUD operations
  - Like/unlike
  - Save/unsave
  - Comments (add, view, delete)
  - Share count tracking
  - Authorization checks

- ⏳ **Order flows** (pending)
  - Order creation
  - Status updates
  - User/partner order views

- ⏳ **Security features** (pending)
  - CSRF protection
  - CORS validation
  - Input sanitization
  - Rate limiting

## 🛠️ Test Helpers & Factories

### Global Test Helpers
Available in all test files via `testHelpers.js`:

```javascript
// Create test entities
const user = await createTestUser({ email: 'custom@example.com' });
const partner = await createTestFoodPartner();
const food = await createTestFood(partner, { price: 12.99 });
const order = await createTestOrder(user, partner, food);

// Generate auth tokens
const { accessToken, refreshToken } = generateAuthTokens(userId, 'user');

// Create session
const session = await createTestSession(userId, 'User', refreshToken);

// Mock external services
const storageService = mockImageKitUpload();

// Extract cookies from response
const accessToken = extractCookie(response, 'accessToken');

// Wait for async operations
await waitFor(100); // milliseconds
```

## Test Coverage

| Metric | Current |
|--------|---------|
| Statements | 66.17% |
| Branches | 42.64% |
| Functions | 53.41% |
| Lines | 67.22% |
| **Total Tests** | **496 (all passing)** |

## Testing Best Practices

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
  const user = await createTestUser({ password: 'test' });
  const isValid = await user.verifyPassword('');
  expect(isValid).toBe(false);
});
```

## Debugging Tests

### Run Single Test File
```bash
npm test -- tests/unit/models/user.model.test.js
```

### Run Single Test Suite
```bash
npm test -- -t "User Model"
```

### Run Single Test
```bash
npm test -- -t "should hash password before saving"
```

### Verbose Output with Handle Detection
```bash
npm run test:verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Common Issues & Solutions

### Issue: Tests timing out
**Solution:** Increase timeout in jest.config.js or specific test
```javascript
jest.setTimeout(30000); // 30 seconds
```

### Issue: Database not clearing
**Solution:** Check `afterEach` in testHelpers.js runs properly

### Issue: MongoDB Memory Server fails to start
**Solution:**
```bash
# Clear cache
rm -rf ~/.cache/mongodb-memory-server

# Reinstall
npm install mongodb-memory-server --save-dev
```

### Issue: Flaky tests
**Solution:**
- Ensure test isolation
- Check for race conditions
- Add `await` to all async operations
- Use `waitFor()` for timing-sensitive operations

## Continuous Integration

Tests can be integrated into CI/CD pipelines. Example workflow includes:
- Unit and integration tests
- Coverage report generation
- Multi-version Node.js testing (18.x, 20.x)

## 🚦 Pre-Commit Checklist

Before committing code:
```bash
# 1. Run all tests
npm test

# 2Pre-Commit Checklist

Before committing code:
1. Run all tests: `npm test`
2. Check coverage: `npm run test:coverage`
3. Fix any failing tests
4. Add tests for new features
5. Update documentation if neededTesting Best Practices](https://testingjavascript.com/)

## 🎓 What You'll Learn

By working with this test suite:

1. **Test-Driven Development (TDD)** - Write tests first, then code
2. **Mocking & Stubbing** - Isolate units under test
3. Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
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
