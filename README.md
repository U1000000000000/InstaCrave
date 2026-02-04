# InstaCrave

Think TikTok meets food delivery - users scroll through food videos and order directly. Food partners post their dishes as short videos and manage orders.

**Stack:** MERN (MongoDB, Express, React, Node)  
**Status:** Learning project with intentionally over-engineered backend (using Redis, BullMQ, WebSockets to learn production patterns, even though they're overkill for this scale)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ React App    │  │ Socket.IO    │  │ Axios HTTP   │      │
│  │ (Vite)       │  │ Client       │  │ Client       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Express.js 5.x                                        │  │
│  │ • CORS, Rate Limiting, CSRF Protection                │  │
│  │ • JWT Authentication (Argon2 hashing)                 │  │
│  │ • Request ID tracking, Structured logging             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Controllers  │  │ Middleware   │  │ Routes       │
│ (HTTP Logic) │  │ (Auth, Val)  │  │ (Endpoints)  │
└──────────────┘  └──────────────┘  └──────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Food Service │  │ Order Service│  │ Auth Service │      │
│  │ Cache Svc    │  │ Cart Service │  │ Analytics Svc│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data & Infrastructure                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ MongoDB 8.x  │  │ Redis 7.x    │  │ BullMQ       │      │
│  │ (Primary DB) │  │ (Cache+Rate) │  │ (Job Queue)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Socket.IO    │  │ ImageKit     │  │ Winston      │      │
│  │ (Real-time)  │  │ (Media CDN)  │  │ (Logging)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Why These Choices?

- **Redis** - Wanted to learn cache invalidation strategies (probably overkill here)
- **BullMQ** - Learning distributed job queues (definitely overkill, could've just used simple timers)
- **Socket.IO** - Actually useful - partners get live order notifications
- **Argon2** - Better than bcrypt for passwords, resists GPU cracking

## What It Does

**Users:** Browse food videos (like/comment/save), follow restaurants, search dishes, place orders

**Food Partners:** Upload food videos, manage incoming orders, update status live, track followers

## Technology Stack

### Backend
- **Runtime:** Node.js 20.x
- **Framework:** Express.js 5.x
- **Database:** MongoDB 8.x with Mongoose ODM
- **Authentication:** JWT with Argon2id password hashing (memory-hard, GPU-resistant)
- **Session Management:** Redis-backed sessions with rotation
- **Caching:** Redis with automatic invalidation and stampede protection
- **Job Queue:** BullMQ for async email/analytics processing
- **Real-time:** Socket.IO for order status updates
- **File Storage:** ImageKit CDN for media uploads
- **Testing:** Jest 29.7 + Supertest 7.1 (496 tests, 67.22% line coverage)
- **Load Testing:** k6 with 8 performance test scenarios
- **Logging:** Winston with structured JSON logs and daily rotation
- **API Documentation:** Swagger/OpenAPI 3.0.3

### Frontend
- **Library:** React 19
- **Build Tool:** Vite 7
- **Routing:** React Router v7
- **Animations:** Framer Motion
- **State Management:** React Context API
- **HTTP Client:** Axios with auto-refresh interceptors
- **Real-time:** Socket.IO client
- **Styling:** CSS3 with custom properties (dark mode support)

### DevOps & Infrastructure
- **Containerization:** Docker with multi-stage builds (dev/prod)
- **Orchestration:** Docker Compose for local development
- **Reverse Proxy:** Nginx for production frontend serving
- **CI/CD:** GitHub Actions (linting, testing, coverage)
- **Process Management:** PM2 for production Node.js processes
- **Health Checks:** Endpoint monitoring for MongoDB, Redis, Queues

### Learning Goals

Wanted to go beyond basic CRUD and try:
- Argon2 password hashing (won the 2015 security competition)
- BullMQ job queues (way overkill but fun to learn)
- Redis caching with invalidation (cache invalidation is hard!)
- WebSockets for live updates
- Integration tests with real databases (not mocks)

## Project Structure

```
InstaCrave/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API endpoints
│   │   ├── middlewares/     # Custom middleware
│   │   ├── services/        # Business logic
│   │   ├── validation/      # Input validation
│   │   ├── queue/           # BullMQ job queues
│   │   └── utils/           # Helper functions
│   ├── tests/               # Jest tests (unit + integration)
│   ├── load-tests/          # k6 performance tests
│   ├── docs/                # API documentation
│   └── logs/                # Application logs
│
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages
│   │   ├── context/         # React Context providers
│   │   ├── services/        # API integration
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Helper functions
│   └── public/              # Static assets
│
├── docker-compose.yml       # Development environment
├── docker-compose.prod.yml  # Production environment
├── ARCHITECTURE.md          # Detailed system architecture
└── README.md                # This file
```

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed system architecture, data flows, and technical decisions
- **[API Documentation](http://localhost:3000/api/v1/docs)** - Interactive Swagger UI (when running locally)
- **[Backend README](./backend/README.md)** - Backend-specific setup and API reference
- **[Frontend README](./frontend/README.md)** - Frontend-specific setup and component guide
- **[Testing Guide](./backend/tests/README.md)** - Test patterns and coverage report

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- MongoDB 8.x
- Redis 7.x (for sessions and caching)
- Docker and Docker Compose (optional, for containerized deployment)

### Environment Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd InstaCrave
```

2. **Backend setup**
```bash
cd backend
npm install
```

Create `.env` file in `backend/` directory:
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

# JWT
JWT_SECRET=your-jwt-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# ImageKit (for file uploads)
IMAGEKIT_PUBLIC_KEY=your-public-key
IMAGEKIT_PRIVATE_KEY=your-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-id

# Argon2 Password Hashing
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=4
ARGON2_PARALLELISM=2
```

3. **Frontend setup**
```bash
cd frontend
npm install
```

Create `.env` file in `frontend/` directory:
```env
VITE_API_URL=http://localhost:3000
```

### Running Locally

**Development mode:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Using Docker Compose:**
```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

## Testing

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration

# Watch mode for development
npm run test:watch
```

**Test Coverage:**
- 496 total tests (all passing)
- 67.22% line coverage
- 66.17% statement coverage
- 53.41% function coverage
- 42.64% branch coverage

### Load Testing
```bash
cd backend

# Run all load tests
./load-tests/run-all-tests.sh

# Run specific scenario
npx k6 run load-tests/scenarios/auth.test.js
```

**Load Test Scenarios:**
- Authentication flows (login, logout, token refresh)
- Food browsing and interactions
- Order placement and management
- Search functionality
- End-to-end user and partner journeys

## API Documentation

Interactive API documentation is available via Swagger UI when the backend server is running:

http://localhost:3000/api-docs

### API Endpoints

**Auth:** Register/login for users and partners, refresh tokens  
**Food:** CRUD operations, like/save/comment  
**Orders:** Create, list, update status  
**Search:** Find food and partners  
**User:** Profile, likes, comments, following  

Full docs at `/api-docs` when running locally

## Database

**Main collections:** users, foodpartners, foods, orders, sessions  
**Social:** likes, saves, comments, follows  
**Analytics:** events (page views, searches, etc.)

All use Mongoose with timestamps. Passwords are Argon2 hashed. See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed schema.
- `comment`: String
- `timestamps`: CreatedAt, UpdatedAt

**follows**
- `user`: ObjectId (ref: users)
- `foodpartner`: ObjectId (ref: foodpartners)
- `timestamps`: CreatedAt, UpdatedAt

**sessions**
- `userId`: ObjectId
- `userType`: Enum ['User', 'FoodPartner']
- `tokenHash`: String (Argon2 hashed refresh token)
- `userAgent`: String
- `ip`: String
- `lastUsedAt`: Date
- `timestamps`: CreatedAt, UpdatedAt

## Security Features

### Input Validation & Sanitization
- All user inputs validated with Joi schemas
- HTML sanitization using `sanitize-html` library
- XSS protection with `xss-clean` middleware
- SQL/NoSQL injection prevention through Mongoose

### Authentication & Authorization
- Secure password hashing with Argon2id
- JWT-based authentication (access + refresh tokens)
- HTTP-only cookies for token storage
- Role-based access control (user vs food partner)
- Session management with Redis backing

### File Upload Security
- File type validation (MIME type + signature check)
- File size limits (10MB max)
- Accepted formats: JPEG, PNG, MP4
- Virus scanning ready (extensible)

### Rate Limiting
- Global rate limiting (2000 requests/hour/IP)
- Endpoint-specific limits (login: 10/15min)
- Redis-backed distributed rate limiting
- Dynamic limits based on user role

### CSRF Protection
- Token-based CSRF protection
- Cookie-based secret storage
- Required for state-changing operations

### Additional Security Measures
- CORS configuration for allowed origins
- Secure headers (helmet middleware ready)
- Request ID tracking for audit trails
- Structured logging with Winston
- Environment variable validation

## Performance Optimization

### Caching Strategy
- Redis-based response caching for GET endpoints
- Cache key generation based on user context
- Automatic cache invalidation on data changes
- TTL-based cache expiration

### Database Optimization
- Indexed fields for frequent queries
- Lean queries where population not needed
- Pagination for list endpoints
- Connection pooling

### Frontend Optimization
- Code splitting with React.lazy
- Image lazy loading
- Debounced search inputs
- Virtual scrolling for long lists (planned)

## Deployment

### Production Checklist

**Backend:**
- Set `NODE_ENV=production`
- Configure production MongoDB cluster
- Set up Redis cluster/replica
- Configure SSL/TLS for database connections
- Set strong JWT secrets
- Enable rate limiting
- Configure CORS for production domain
- Set up error monitoring (Sentry integration ready)
- Configure log rotation and centralized logging

**Frontend:**
- Build with `npm run build`
- Serve via Nginx or CDN
- Configure environment variables
- Enable gzip compression
- Set up HTTPS

**Infrastructure:**
- Use reverse proxy (Nginx)
- Set up load balancing (if needed)
- Configure auto-scaling
- Set up database backups
- Monitor application metrics

### Docker Deployment

**Production build:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Scaling services:**
```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

## Dev Workflow

**Testing:** Jest + Supertest, integration tests with real MongoDB, k6 load tests  
**CI/CD:** GitHub Actions (lint, test, coverage)  
**Code style:** ESLint + Airbnb guide

## Honest Assessment

Built this to learn production patterns beyond basic CRUD. Some stuff is over-engineered on purpose:

**Over-kills:** BullMQ for job queues (could've used timers), extensive caching (small dataset), Redis sessions  
**Actually useful:** Argon2 security, Socket.IO for live orders, integration tests with real DBs

**Missing for production:** DB migrations, horizontal scaling, CDN, real payment gateway, proper monitoring

**Test coverage:** 496 tests at 67.22% (honest number, not inflated)

---

*Made while learning backend dev - feedback welcome!*
