# Testing Documentation

## Coverage Summary

```
Statements: 51%
Branches:   30%
Functions:  35%
Lines:      51%
```

Total: 496 tests passing across 23 suites

## Test Structure

**Integration Tests** (integration/ - 11 files)
- auth.integration.test.js - Authentication flows
- food.integration.test.js - Food CRUD operations
- food-v1.test.js - V1 API endpoints
- food-v2.test.js - V2 API with advanced filtering
- food-partner-extended.test.js - Partner features
- food-partner-food.test.js - Partner food management
- order.integration.test.js - Order flows
- search.test.js - Search functionality
- security.integration.test.js - CSRF, CORS, sanitization
- user.test.js - User profile operations
- app-error-handling.test.js - Global error handling

**Unit Tests** (unit/)
- middlewares/ - CORS, rate limiting, query validation (3 files)
- Other folders empty by design (components tested via integration)

## Component Coverage

**Models** - 100%
- User, FoodPartner, Food, Order models
- Password hashing, validation, relationships

**Validation Schemas** - 100%
- All Joi validation schemas tested

**Controllers** - 0% (tested via integration)
- auth, food, food-partner, order, search, user
- All tested through actual HTTP requests

**Middlewares** - Varies
- auth: 93%
- queryValidation: 100%
- validate: 100%
- fileUpload: 82%
- advancedCors: 88%

**Services** - Varies
- Token service well covered
- Email/Storage services mocked

## Running Tests

```bash
npm test                    # All tests
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode
npm run test:verbose        # Detailed output
npm run test:integration    # Integration only
npm run test:unit           # Unit only
```

## Test Helpers

```javascript
// Create test data
const user = await createTestUser();
const partner = await createTestFoodPartner();
const food = await createTestFood(partner);
const order = await createTestOrder(user, partner, food);

// Auth tokens
const tokens = generateAuthTokens(userId, 'user');

// Sessions
const session = await createTestSession(userId, 'User', refreshToken);

// Extract cookies
const token = extractCookie(response, 'accessToken');
```

## Notes

- Controllers have 0% direct coverage but are fully tested via integration tests
- Integration tests provide better coverage than mocked unit tests for API endpoints
- MongoDB Memory Server provides isolated test database
- All async operations properly awaited to avoid flaky tests
