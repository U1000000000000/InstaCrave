# InstaCrave - Food Discovery Platform

A full-stack web application for discovering and ordering food through short-form video content. Built as a final year engineering project combining social media features with e-commerce functionality.

## Project Overview

InstaCrave is a MERN stack application that enables food vendors (partners) to showcase their dishes through short video reels, while users can discover, interact with, and order food. The platform implements features similar to social media platforms (likes, comments, follows) combined with e-commerce capabilities (cart, checkout, orders).

**Domain:** Full-Stack Web Development  
**Tech Stack:** MongoDB, Express.js, React, Node.js (MERN)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Performance Characteristics](#performance-characteristics)
- [Security Implementations](#security-implementations)
- [Known Limitations](#known-limitations)
- [Future Enhancements](#future-enhancements)
- [License](#license)

---

## Features

### User Features

#### Authentication & Profile
- User registration and login with email/password
- JWT-based authentication with access and refresh tokens
- Session management with device tracking
- Profile management (update name, password, profile picture)

#### Content Discovery
- Infinite scroll feed of food reels (videos)
- Search functionality for food items and partners
- Explore page with trending content
- Filter and sort options

#### Social Interactions
- Like food items
- Save food items for later
- Comment on food reels
- Follow food partners
- View personal activity (likes, saves, comments)

#### E-Commerce
- Shopping cart with add/update/remove items
- Multi-step checkout process
- Multiple payment method support (card, UPI, cash on delivery)
- Order placement and tracking
- Order history with status updates

### Food Partner Features

#### Content Management
- Upload food videos with details (name, description, price)
- Edit and delete own food items
- Manage profile and business information

#### Order Management
- Receive order notifications (real-time via WebSocket)
- View and manage incoming orders
- Update order status (preparing, ready, delivered)

#### Analytics
- View follower count
- Track food item engagement (views, likes, comments)
- Monitor order history

### System Features

#### Performance
- Redis-based caching for frequently accessed data
- Cache invalidation on data mutations
- Pagination for large data sets
- Lazy loading for images/videos

#### Background Processing
- BullMQ job queues for asynchronous tasks
- Email notifications (welcome emails, order confirmations)
- Analytics event tracking
- Scheduled jobs (session cleanup, cache warming)

#### Security
- CSRF protection for state-changing operations
- Rate limiting on API endpoints
- Input sanitization (HTML/XSS prevention)
- Password hashing with Argon2
- File upload validation

---

## Architecture

### High-Level Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │ ←HTTP→  │   Backend   │ ←────→  │   MongoDB   │
│   (React)   │         │  (Express)  │         │  (Database) │
└─────────────┘         └─────────────┘         └─────────────┘
                              │
                              ├─────→  Redis (Cache & Queue)
                              ├─────→  ImageKit (CDN)
                              └─────→  Email Service
```

### Backend Architecture

**Pattern:** MVC (Model-View-Controller) with Service Layer

```
Routes → Middleware → Controllers → Services → Repositories → Models
```

**Key Components:**
- **Routes:** Define API endpoints and apply middleware
- **Middleware:** Authentication, validation, caching, rate limiting
- **Controllers:** Handle HTTP requests/responses
- **Services:** Business logic implementation
- **Repositories:** Data access layer
- **Models:** Mongoose schemas and database interaction

### Database Schema

**Collections:**
- `users` - User accounts and profiles
- `foodpartners` - Food vendor accounts
- `foods` - Food items with videos
- `orders` - Order records
- `payments` - Payment transactions
- `carts` - Shopping carts
- `comments` - User comments on food items
- `likes` - Like relationships
- `saves` - Saved food items
- `follows` - Follow relationships
- `sessions` - Active user sessions
- `analytics` - Event tracking data

---

## Technology Stack

### Backend
- **Runtime:** Node.js 20.x
- **Framework:** Express 5.x
- **Database:** MongoDB 7.0 (with Mongoose ODM)
- **Caching:** Redis 7.x (with ioredis client)
- **Queue:** BullMQ 5.x (Redis-backed job queue)
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** Argon2
- **Validation:** Joi
- **File Uploads:** Multer
- **Email:** Nodemailer
- **Logging:** Winston (with daily rotate file transport)
- **API Documentation:** Swagger (OpenAPI 3.0)
- **Testing:** Jest + Supertest
- **Real-time:** Socket.IO

### Frontend
- **Library:** React 19.x
- **Build Tool:** Vite 7.x
- **Routing:** React Router 7.x
- **HTTP Client:** Axios
- **State Management:** Context API
- **Animations:** Framer Motion
- **Icons:** React Icons + Lucide React
- **Notifications:** React Hot Toast
- **Real-time:** Socket.IO Client

### DevOps & Infrastructure
- **Containerization:** Docker + Docker Compose
- **Web Server:** Nginx (for frontend in production)
- **CDN:** ImageKit (for image/video hosting)
- **Development:** Nodemon (backend), Vite Dev Server (frontend)

---

## System Requirements

### Development Environment
- **Node.js:** 20.x or higher
- **npm:** 10.x or higher
- **MongoDB:** 7.0 or higher (local or cloud)
- **Redis:** 7.x or higher (local or cloud)
- **Docker:** 24.x or higher (optional, for containerized setup)
- **Docker Compose:** 2.x or higher (optional)

### Production Environment
- **CPU:** 2+ cores recommended
- **RAM:** 4GB minimum, 8GB recommended
- **Storage:** 20GB minimum (for logs, uploads, database)
- **Network:** Stable internet connection for third-party services

---

## Installation

### Quick Start with Docker (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd InstaCrave2.0
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/docs
   - Queue Dashboard: http://localhost:3000/admin/queues

### Manual Setup

#### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Required environment variables:**
   ```env
   # Server
   PORT=3000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/instacrave
   
   # Redis
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=
   
   # JWT
   JWT_SECRET=your-secret-key-min-32-chars
   JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
   
   # ImageKit (optional for image uploads)
   IMAGEKIT_PUBLIC_KEY=
   IMAGEKIT_PRIVATE_KEY=
   IMAGEKIT_URL_ENDPOINT=
   
   # Email (optional for notifications)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=
   EMAIL_PASSWORD=
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

#### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (if needed):**
   - Frontend uses `.env.development` and `.env.production`
   - Default API URL is `http://localhost:3000/api/v1`

4. **Start development server:**
   ```bash
   npm run dev
   ```

---

## Project Structure

```
InstaCrave2.0/
├── backend/                    # Backend application
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── middlewares/       # Custom middleware
│   │   ├── validation/        # Input validation schemas
│   │   ├── utils/             # Utility functions
│   │   ├── queue/             # BullMQ job definitions
│   │   ├── constants/         # Constants and enums
│   │   └── app.js             # Express app setup
│   ├── tests/                 # Test suites
│   │   ├── unit/              # Unit tests
│   │   ├── integration/       # Integration tests
│   │   └── setup/             # Test configuration
│   ├── logs/                  # Application logs
│   ├── docs/                  # Documentation
│   ├── Dockerfile             # Backend Docker image
│   ├── package.json           # Dependencies
│   └── server.js              # Entry point
│
├── frontend/                  # Frontend application
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── context/          # React context providers
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API client
│   │   ├── utils/            # Utility functions
│   │   └── styles/           # CSS stylesheets
│   ├── public/               # Static assets
│   ├── Dockerfile            # Frontend Docker image
│   ├── nginx.conf            # Nginx configuration
│   └── package.json          # Dependencies
│
├── docker-compose.yml         # Development environment
├── docker-compose.prod.yml    # Production environment
├── LICENSE                    # MIT License
└── README.md                  # This file
```

---

## API Documentation

### Interactive Documentation

When the backend is running, visit:
- **Swagger UI:** http://localhost:3000/docs
- **OpenAPI JSON:** http://localhost:3000/openapi.json

### API Versioning

The API uses URI versioning:
- **v1:** `/api/v1/` - Current stable version
- **v2:** `/api/v2/` - Extended features (food endpoints)

### Main Endpoints

#### Authentication
- `POST /api/v1/auth/user/register` - User registration
- `POST /api/v1/auth/user/login` - User login
- `POST /api/v1/auth/food-partner/register` - Partner registration
- `POST /api/v1/auth/food-partner/login` - Partner login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/sessions` - List active sessions
- `DELETE /api/v1/auth/sessions/:sessionId` - Revoke session

#### Food Items
- `GET /api/v1/food` - List all food items (paginated)
- `GET /api/v1/food/:id` - Get food item details
- `POST /api/v2/food` - Create food item (partner only)
- `PATCH /api/v2/food/:id` - Update food item (partner only)
- `DELETE /api/v2/food/:id` - Delete food item (partner only)

#### Social Features
- `POST /api/v2/food/:id/like` - Like food item
- `DELETE /api/v2/food/:id/like` - Unlike food item
- `POST /api/v2/food/:id/save` - Save food item
- `DELETE /api/v2/food/:id/save` - Unsave food item
- `POST /api/v2/food/:id/comment` - Add comment
- `GET /api/v2/food/:id/comments` - Get comments
- `POST /api/v1/food-partner/:id/follow` - Follow partner
- `DELETE /api/v1/food-partner/:id/follow` - Unfollow partner

#### Cart & Orders
- `GET /api/v1/cart` - Get user's cart
- `POST /api/v1/cart/items` - Add item to cart
- `PATCH /api/v1/cart/items/:foodId` - Update item quantity
- `DELETE /api/v1/cart/items/:foodId` - Remove item from cart
- `POST /api/v1/payments/initiate` - Initiate payment
- `POST /api/v1/payments/process` - Process payment
- `GET /api/v1/orders` - Get user's orders
- `GET /api/v1/orders/partner` - Get partner's orders (partner only)
- `PATCH /api/v1/orders/:id/status` - Update order status (partner only)

#### Search & Discovery
- `GET /api/v1/search?query=...` - Search food and partners
- `GET /api/v1/search/explore` - Get explore page content

### Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ },
  "pagination": { /* if applicable */ }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [ /* validation errors if applicable */ ]
}
```

---

## Testing

### Backend Testing

The backend includes comprehensive test coverage:

**Test Statistics:**
- Total Test Suites: 23
- Total Tests: 496
- Coverage: ~51% overall (models and validations well-covered)

**Test Types:**
1. **Unit Tests** - Test individual functions and utilities
2. **Integration Tests** - Test API endpoints end-to-end

**Running Tests:**

```bash
cd backend

# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run with coverage report
npm run test:coverage

# Run in watch mode
npm run test:watch
```

**Test Environment:**
- Uses MongoDB Memory Server (in-memory database)
- Mocks Redis and external services
- Isolated test database for each test suite
- Automatic cleanup after tests

**Coverage Details:**
- Statements: 51%
- Lines: 52%
- Functions: 41%
- Branches: 34%

**What's Tested:**
- ✅ All models (100% coverage)
- ✅ Validation schemas (100% coverage)
- ✅ Core utilities and helpers
- ⚠️ Integration tests for main API endpoints
- ❌ Controllers, repositories, and some services need more tests

### Load Testing

Load tests are included using k6:

```bash
cd backend/load-tests
./run-all-tests.sh
```

**Test Scenarios:**
- Authenticated user workflows
- Food partner operations
- CSRF protection
- End-to-end user journeys

---

## Deployment

### Docker Deployment (Production)

1. **Configure production environment:**
   ```bash
   cp .env.prod.example .env.prod
   # Edit .env.prod with production credentials
   ```

2. **Build and start:**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify deployment:**
   ```bash
   curl http://localhost:5000/health
   ```

### Environment-Specific Configurations

**Development (`docker-compose.yml`):**
- Frontend: Port 5173 (Vite dev server)
- Backend: Port 3000
- MongoDB: Port 27017
- Redis: Port 6379
- Hot reload enabled
- Source code mounted as volumes

**Production (`docker-compose.prod.yml`):**
- Frontend: Port 3000 (Nginx)
- Backend: Port 5000
- Optimized builds
- Resource limits enforced
- Health checks configured
- Multi-stage Docker builds

### Service URLs

**Development:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/docs
- Queue Dashboard: http://localhost:3000/admin/queues

**Production:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/docs
- Queue Dashboard: http://localhost:5000/admin/queues

---

## Performance Characteristics

### Measured Metrics

**API Response Times (p95):**
- Cache HIT: <50ms
- Cache MISS: <200ms
- Database queries: 100-300ms
- File uploads: 1-3s (depending on size)

**Throughput:**
- Tested with k6 load testing tool
- Handles 1000+ requests/second with 50 virtual users
- Success rate: 99.5%+

**Caching:**
- Redis-based cache-aside pattern
- Hit rate: 70-90% (varies by endpoint)
- TTL: 60-600 seconds depending on data volatility
- Automatic invalidation on data mutations

**Database:**
- Indexed fields for common queries
- Pagination (default 10 items per page)
- Aggregation pipelines for complex queries

### Optimization Techniques

1. **Database Indexing:**
   - Compound indexes on frequently queried fields
   - Text indexes for search functionality

2. **Caching Strategy:**
   - Cache frequently accessed data (food lists, partner profiles)
   - Cache scopes: public, user-specific, partner-specific
   - Invalidation on create/update/delete operations

3. **Image/Video Handling:**
   - CDN (ImageKit) for media delivery
   - Lazy loading in frontend
   - File size limits enforced

4. **Code Splitting:**
   - React lazy loading for routes
   - Vite code splitting in production builds

---

## Security Implementations

### Authentication & Authorization

1. **JWT Tokens:**
   - Access token: 15 minutes expiry
   - Refresh token: 7 days expiry
   - HTTP-only cookies for token storage
   - Secure flag in production

2. **Password Security:**
   - Argon2 hashing algorithm
   - Salt rounds: Automatic (Argon2 default)
   - Memory cost: 65536 KB
   - Time cost: 3 iterations

3. **Session Management:**
   - Device fingerprinting (user agent tracking)
   - Active session listing
   - Session revocation capability

### Input Validation & Sanitization

1. **Validation:**
   - Joi schemas for all API inputs
   - Type checking and constraints
   - Custom validation rules

2. **Sanitization:**
   - HTML tag stripping (sanitize-html)
   - XSS prevention
   - SQL injection prevention (Mongoose escaping)

### CSRF Protection

- Token-based CSRF protection using csurf
- Required for state-changing operations
- Exempted endpoints: auth, webhooks

### Rate Limiting

- Redis-backed rate limiting
- Default: 2000 requests/hour per IP
- Stricter limits on sensitive endpoints (login: 10/hour)
- Role-aware limits (food partners get higher limits)

### File Upload Security

- File type validation (MIME type + magic number)
- File size limits
- Virus scanning (recommended for production)
- Secure file storage (CDN)

### Additional Security Measures

1. **Headers:**
   - CORS configuration
   - Security headers (via helmet recommended)

2. **Logging:**
   - Winston logger with daily rotation
   - Error logs separate from access logs
   - Sensitive data excluded from logs

3. **Environment:**
   - Secrets stored in environment variables
   - No hardcoded credentials
   - .env files gitignored

---

## Known Limitations

### Current Implementation Limitations

1. **Real-time Features:**
   - WebSocket implementation exists but is limited to order notifications
   - No real-time chat or live comments

2. **Payment Processing:**
   - Mock payment gateway (not production-ready)
   - No actual payment processor integration
   - Testing mode only

3. **Media Processing:**
   - No video transcoding or optimization
   - Relies on client-side video quality
   - No thumbnail generation

4. **Search:**
   - Basic MongoDB text search
   - No advanced filters (price range, ratings)
   - No fuzzy matching

5. **Analytics:**
   - Event tracking implemented
   - No data visualization dashboard for partners
   - Limited aggregation capabilities

6. **Scalability:**
   - Single-instance deployment
   - No horizontal scaling implemented
   - No load balancer configuration

7. **Email:**
   - Email sending implemented but requires SMTP configuration
   - No email templates (plain text only)

### Browser Compatibility

- Tested on: Chrome 120+, Firefox 120+, Safari 17+
- Mobile: iOS Safari, Chrome Mobile
- Not tested on: Internet Explorer, older browsers

---

## Future Enhancements

### Planned Features

1. **Enhanced Payment:**
   - Integrate real payment gateway (Stripe/Razorpay)
   - Support for multiple currencies
   - Refund processing

2. **Advanced Search:**
   - Elasticsearch integration
   - Filters (price, cuisine, rating)
   - Location-based search

3. **Content Moderation:**
   - Automated content review
   - Reporting system
   - Admin moderation panel

4. **Recommendations:**
   - Machine learning-based recommendations
   - Personalized feed
   - Similar items suggestions

5. **Communication:**
   - In-app messaging
   - Push notifications
   - Email notification preferences

6. **Partner Features:**
   - Advanced analytics dashboard
   - Revenue reports
   - Inventory management

7. **Mobile Applications:**
   - React Native mobile apps
   - Progressive Web App (PWA)

---

## Development Team

This project was developed as a final year engineering project.

**Contributions Welcome:**
- Bug reports
- Feature requests
- Code improvements
- Documentation updates

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

**Technologies Used:**
- Node.js and npm ecosystem
- React and Vite teams
- MongoDB and Redis communities
- Docker and containerization tools

**Learning Resources:**
- Official documentation of all frameworks and libraries
- Stack Overflow community
- GitHub open source projects

---

## Contact & Support

For questions, issues, or suggestions:
- Open an issue in the repository
- Check existing documentation
- Review API documentation at `/docs` endpoint

---

**Note:** This is an academic project created for learning purposes. The implementation demonstrates full-stack development skills and modern web technologies but should not be used in production without proper security audits, payment gateway integration, and infrastructure hardening.
