# Load Testing Suite

Load testing framework for the backend API using k6. Tests concurrent users and partners against all endpoints.

## Features

- 50 test user accounts (test1@u.com to test50@u.com)
- 50 test partner accounts (test1@p.com to test50@p.com)
- CSRF token validation
- Session isolation per virtual user
- Coverage of authentication, CRUD operations, and end-to-end flows  

## Directory Structure

```
load-tests/
├── config/
│   └── constants.js                        # Scenarios, thresholds, config
├── utils/
│   └── helpers.js                          # Auth, CSRF, helpers
├── scripts/
│   ├── register-users.js                   # Register 50 test users
│   └── register-partners.js                # Register 50 test partners
├── scenarios/
│   ├── auth.test.js                        # Authentication (User + Partner pools)
│   ├── food.test.js                        # Food operations (User pool)
│   ├── food-partner.test.js                # Partner operations (Both pools)
│   ├── order.test.js                       # Order management (Both pools)
│   ├── search.test.js                      # Search (User pool)
│   ├── user.test.js                        # User profile (User pool)
│   ├── end-to-end-user-journey.test.js     # Full user flow (50 VUs)
│   └── end-to-end-partner-journey.test.js  # Full partner flow (50 VUs)
├── run-all-tests.sh                        # Master test runner
└── README.md                               # This file
```

## Setup

### Register Test Accounts (One-Time)

```bash
# Register 50 users (test1@u.com to test50@u.com)
npx k6 run load-tests/scripts/register-users.js

# Register 50 food partners (test1@p.com to test50@p.com)
npx k6 run load-tests/scripts/register-partners.js
```

### 2. Run All Tests

```bash
# Run complete test suite
./load-tests/run-all-tests.sh
```

### Run Individual Tests

```bash
npx k6 run load-tests/scenarios/auth.test.js
npx k6 run load-tests/scenarios/user.test.js
npx k6 run load-tests/scenarios/food.test.js
npx k6 run load-tests/scenarios/food-partner.test.js
npx k6 run load-tests/scenarios/order.test.js
npx k6 run load-tests/scenarios/search.test.js
npx k6 run load-tests/scenarios/end-to-end-user-journey.test.js
npx k6 run load-tests/scenarios/end-to-end-partner-journey.test.js
```

## Test Scenarios

| Scenario | Description | VUs | Duration |
|----------|-------------|-----|----------|
| auth.test.js | User/partner login, logout, authentication | 10 | 30s |
| user.test.js | Profile management, follows, likes, sessions | 10 | 30s |
| food.test.js | Browse food, like, save, comment | 10 | 30s |
| food-partner.test.js | Partner profile, following | 10 | 30s |
| order.test.js | Create orders, view orders, update status | 10 | 30s |
| search.test.js | Search food/partners, explore content | 10 | 30s |
| end-to-end-user-journey.test.js | Complete user flow | 50 | 5m |
| end-to-end-partner-journey.test.js | Complete partner flow | 50 | 5m |

## Test Accounts

- **Users**: test1@u.com through test50@u.com (password: test12)
- **Partners**: test1@p.com through test50@p.com (password: test12)

Each virtual user in k6 is assigned a unique account from the pool to simulate realistic concurrent usage.

## Performance Metrics

Current thresholds configured in `config/constants.js`:

- **Response Time**: p95 < 3s, p99 < 8s
- **Error Rate**: < 5%
- **Throughput**: > 5 req/s

These thresholds are set for development environment. Production deployments with proper infrastructure should target stricter values.
