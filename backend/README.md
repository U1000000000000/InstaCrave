# Backend API

Node.js/Express API for InstaCrave. Handles auth, food management, orders, and real-time updates.

**Architecture:** MVC pattern with controllers → services → models

## Technology Stack

- **Runtime:** Node.js 20.x
- **Framework:** Express.js 5.1
- **Database:** MongoDB 8.x (with Mongoose 8.17 ODM)
- **Cache & Sessions:** Redis 7.x (via IORedis 5.8)
- **Authentication:** JWT (jsonwebtoken 9.0) + Argon2 password hashing
- **File Storage:** ImageKit SDK 6.0
- **Validation:** Joi 18.0 + express-validator
- **Testing:** Jest 29.7 + Supertest 7.1 + MongoDB Memory Server
- **Load Testing:** k6
- **API Docs:** Swagger (swagger-jsdoc + swagger-ui-express)
- **Logging:** Winston 3.19 with daily rotation

## Project Structure

```
backend/
├── src/
│   ├── app.js                  # Express app configuration
│   ├── server.js               # HTTP server entry point
│   │
│   ├── controllers/            # Request handlers
│   │   ├── auth.controller.js
│   │   ├── food.controller.js
│   │   ├── food.v2.controller.js
│   │   ├── food-partner.controller.js
│   │   ├── order.controller.js
│   │   ├── search.controller.js
│   │   └── user.controller.js
│   │
│   ├── models/                 # Mongoose schemas
│   │   ├── user.model.js
│   │   ├── foodpartner.model.js
│   │   ├── food.model.js
│   │   ├── order.model.js
│   │   ├── comment.model.js
│   │   ├── likes.model.js
│   │   ├── save.model.js
│   │   ├── follow.model.js
│   │   └── session.model.js
│   │
│   ├── routes/                 # Express routes
│   │   ├── auth.routes.js
│   │   ├── food.routes.js
│   │   ├── food.v2.routes.js
│   │   ├── food-partner.routes.js
│   │   ├── order.routes.js
│   │   ├── search.routes.js
│   │   └── user.routes.js
│   │
│   ├── middlewares/            # Custom middleware
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── rateLimiter.middleware.js
│   │   ├── cache.middleware.js
│   │   ├── csrf.middleware.js
│   │   ├── fileUpload.middleware.js
│   │   ├── requestId.middleware.js
│   │   └── validate.middleware.js
│   │
│   ├── services/               # Business logic & external integrations
│   │   ├── storage.service.js  # ImageKit integration
│   │   ├── token.service.js    # JWT & refresh token handling
│   │   ├── redis.service.js    # Redis client wrapper
│   │   └── logger.service.js   # Winston logger
│   │
│   ├── validation/             # Joi validation schemas
│   │   ├── auth.validation.js
│   │   ├── food.validation.js
│   │   ├── order.validation.js
│   │   └── query.validation.js
│   │
│   ├── utils/                  # Helper functions
│   │   ├── AppError.js
│   │   ├── catchAsync.js
│   │   ├── response.js
│   │   ├── query.js
│   │   └── uuid.js
│   │
│   └── docs/                   # Swagger documentation
│       └── swagger-setup.js
│
├── tests/                      # Test suites
│   ├── setup/
│   │   ├── globalSetup.js      # MongoDB Memory Server init
│   │   ├── globalTeardown.js   # Cleanup
│   │   └── testHelpers.js      # Test utilities
│   │
│   └── integration/            # Integration tests
│       ├── auth.integration.test.js
│       ├── food.integration.test.js
│       ├── food-v1.test.js
│       ├── food-v2.test.js
│       ├── food-partner-extended.test.js
│       ├── food-partner-food.test.js
│       ├── order.integration.test.js
│       ├── search.test.js
│       ├── user.test.js
│       ├── security.integration.test.js
│       └── app-error-handling.test.js
│
├── load-tests/                 # k6 performance tests
│   ├── scenarios/
│   │   ├── auth.test.js
│   │   ├── food.test.js
│   │   ├── food-partner.test.js
│   │   ├── order.test.js
│   │   ├── search.test.js
│   │   ├── user.test.js
│   │   ├── end-to-end-user-journey.test.js
│   │   └── end-to-end-partner-journey.test.js
│   │
│   ├── scripts/
│   │   ├── register-users.js
│   │   └── register-partners.js
│   │
│   ├── utils/
│   │   └── helpers.js
│   │
│   ├── config/
│   │   └── constants.js
│   │
│   └── run-all-tests.sh
│
├── docs/                       # Additional documentation
│   ├── SECURITY.md
│   ├── rate-limiting.md
│   ├── CACHE_QUICK_REFERENCE.md
│   └── QUEUE_QUICK_REFERENCE.md
│
├── logs/                       # Winston log files
├── .env.example                # Environment template
├── Dockerfile                  # Production Docker image
├── jest.config.js              # Jest configuration
├── package.json
└── README.md                   # This file
```

## Installation

### Prerequisites
- Node.js 20.x or higher
- MongoDB 8.x
- Redis 7.x
- ImageKit account (for file uploads)

### Setup

1. **Install dependencies**
```bash
npm install
```

2. **Environment Configuration**

Create a `.env` file in the backend root directory:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/instacrave

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
APP_CACHE_VERSION=v1

# JWT Authentication
JWT_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

# Argon2 Password Hashing
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=4
ARGON2_PARALLELISM=2

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Optional: Email (if implemented)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-password
```

3. **Start MongoDB and Redis**
```bash
# MongoDB
mongod --dbpath /path/to/data

# Redis
redis-server
```

## Running the Application

### Development Mode
```bash
npm run dev
```
Server runs on http://localhost:3000 with hot reloading via nodemon.

### Production Mode
```bash
npm start
```

### Using Docker
```bash
# Build image
docker build -t instacrave-backend .

# Run container
docker run -p 3000:3000 --env-file .env instacrave-backend
```

## API Documentation

Once the server is running, access interactive API documentation:

**Swagger UI:** http://localhost:3000/api-docs

The documentation includes:
- All available endpoints
- Request/response schemas
- Authentication requirements
- Example requests

## Testing

### Testing

```bash
npm test                 # All tests
npm run test:coverage   # With coverage
npm run test:watch      # Watch mode
```

**Coverage:** 496 tests, 67.22% line coverage (see `coverage/` for reports)

**Load tests:** k6 scenarios in `load-tests/` (register test users first with scripts)

## Features

**Auth:** JWT with Argon2 hashing, refresh tokens, session management  
**Security:** Joi validation, CSRF, XSS protection, rate limiting, file signature checks  
**Caching:** Redis with auto-invalidation on mutations  
**Storage:** ImageKit for media (10MB limit, type validation)  
**Real-time:** Socket.IO for order updates  
**Logging:** Winston with JSON format and request tracking
- Production vs development error details
- Comprehensive logging

### Logging
- Winston logger with multiple transports
- Daily rotating file logs
- Separate error and combined logs
- Request ID correlation
- Structured JSON logging

### API Versioning
- V1 API for basic functionality
- V2 API with advanced features (filtering, sorting, pagination)
- Backward compatibility maintained

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/user/register` | Register new user | No |
| POST | `/api/v1/auth/user/login` | User login | No |
| GET | `/api/v1/auth/user/logout` | User logout | Yes |
| POST | `/api/v1/auth/food-partner/register` | Register food partner | No |
| POST | `/api/v1/auth/food-partner/login` | Food partner login | No |
| GET | `/api/v1/auth/food-partner/logout` | Food partner logout | Yes |
| GET | `/api/v1/auth/refresh` | Refresh access token | Yes (refresh token) |
| GET | `/api/v1/auth/me` | Get current user | Yes |
| GET | `/api/v1/auth/sessions` | List active sessions | Yes |
| DELETE | `/api/v1/auth/sessions/:id` | Revoke session | Yes |

### Food (V1)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/food` | List all food items | Yes (User) |
| POST | `/api/v1/food` | Create food item | Yes (Partner) |
| GET | `/api/v1/food/followed` | Get followed partners' food | Yes (User) |
| POST | `/api/v1/food/like` | Like/unlike food | Yes (User) |
| POST | `/api/v1/food/save` | Save/unsave food | Yes (User) |
| GET | `/api/v1/food/save` | Get saved foods | Yes (User) |
| POST | `/api/v1/food/comment` | Comment on food | Yes (User) |
| GET | `/api/v1/food/comment` | Get food comments | Yes (User) |
| POST | `/api/v1/food/delete-comment` | Delete comment | Yes (User) |
| PATCH | `/api/v1/food/:id` | Edit food item | Yes (Partner) |
| DELETE | `/api/v1/food/:foodId` | Delete food item | Yes (Partner) |
| POST | `/api/v1/food/share` | Increment share count | Yes (User) |

### Food (V2 - Enhanced)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v2/food` | List with filtering/sorting/pagination | Yes (User) |
| PATCH | `/api/v2/food/:id` | Edit food (with file upload) | Yes (Partner) |
| DELETE | `/api/v2/food/:foodId` | Delete food | Yes (Partner) |

**V2 Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sort`: Sort field (e.g., `price`, `-createdAt`)
- `category`: Filter by category
- `price[gte]`, `price[lte]`: Price range filtering
- `name`: Search by name
- `foodPartner`: Filter by partner ID
- `isOrderable`: Filter orderable items

### Orders
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/orders` | Create order | Yes (User) |
| GET | `/api/v1/orders` | Get user orders | Yes (User) |
| GET | `/api/v1/orders/partner` | Get partner orders | Yes (Partner) |
| PATCH | `/api/v1/orders/:id/status` | Update order status | Yes (Partner) |

### Search
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/search` | Search food/partners | Yes (User) |
| GET | `/api/v1/search/explore` | Explore trending content | Yes (User) |

### User Profile
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/user` | Get user profile | Yes (User) |
| PATCH | `/api/v1/user` | Update profile | Yes (User) |
| GET | `/api/v1/user/likes` | Get liked foods | Yes (User) |
| GET | `/api/v1/user/comments` | Get user comments | Yes (User) |
| GET | `/api/v1/user/following` | Get followed partners | Yes (User) |

### Food Partner
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/food-partner` | Get partner profile | Yes (Partner) |
| PATCH | `/api/v1/food-partner` | Update profile | Yes (Partner) |
| POST | `/api/v1/food-partner/follow` | Follow/unfollow partner | Yes (User) |

## Database Models

### User
```javascript
{
  fullName: String,
  email: String (unique),
  password: String (Argon2 hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Food Partner
```javascript
{
  name: String,
  contactName: String,
  email: String (unique),
  password: String (Argon2 hashed),
  phone: String,
  address: String,
  profileImage: String (URL),
  followCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Food
```javascript
{
  name: String,
  description: String,
  video: String (URL),
  foodPartner: ObjectId (ref: foodpartners),
  isOrderable: Boolean,
  price: Number,
  likeCount: Number,
  savesCount: Number,
  commentCount: Number,
  shareCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Order
```javascript
{
  user: ObjectId (ref: users),
  userName: String,
  foodPartner: ObjectId (ref: foodpartners),
  foodPartnerName: String,
  food: ObjectId (ref: foods),
  foodName: String,
  quantity: Number,
  totalPrice: Number,
  deliveryAddress: String,
  status: Enum [pending, confirmed, preparing, ready, delivered, cancelled],
  createdAt: Date,
  updatedAt: Date
}
```

### Session
```javascript
{
  userId: ObjectId,
  userType: Enum [User, FoodPartner],
  tokenHash: String (Argon2 hashed),
  userAgent: String,
  ip: String,
  lastUsedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Social Interactions
**Likes, Saves, Comments, Follows** - Simple junction tables with user/food/partner references and timestamps.

## Deployment

### Environment Variables
Ensure all required environment variables are set in production:
Strong JWT_SECRET, production DB/Redis URIs, ImageKit creds, CORS origins

**Docker:** `docker-compose -f docker-compose.prod.yml up -d`

## Dev Notes

**Code style:** Using async/await everywhere, Airbnb style guide, ESLint

**Adding endpoints:** Controller → Validation → Route → Swagger → Tests

**Error handling:** Using `catchAsync` wrapper and custom `AppError` class

```javascript
const someController = catchAsync(async (req, res) => {
  const data = await Model.findById(req.params.id);
  if (!data) throw new AppError('Not found', 404);
  res.json({ success: true, data });
});
```

## Troubleshooting

**MongoDB issues:** Check it's running (`mongod --version`), verify URI in `.env`  
**Redis issues:** Check with `redis-cli ping`, verify host/port  
**Upload fails:** Check ImageKit creds, file size <10MB, type is JPEG/PNG/MP4  
**Tests fail:** Clear Jest cache (`npx jest --clearCache`), check MongoDB Memory Server installed  
**Rate limiting:** Localhost bypassed in dev with 100k limit

---

*Built with ☕ as a learning project*
