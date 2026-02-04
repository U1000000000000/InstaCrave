# System Architecture

*Deep dive into how everything's wired together. Fair warning: some of this is over-engineered for learning purposes.*

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           FRONTEND                               │
│  React 19 + Vite 7 + React Router v7 + Socket.IO Client        │
│  • User Interface (Browse, Order, Track)                        │
│  • Food Partner Dashboard                                       │
│  • Real-time Order Updates                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Express)                       │
│  • CORS & Rate Limiting                                         │
│  • JWT Authentication (Argon2 hashing)                          │
│  • CSRF Protection                                              │
│  • Request Tracing & Structured Logging                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Controllers  │    │  Middleware  │    │   Routes     │
│ (HTTP Logic) │    │ (Auth, Val)  │    │ (Endpoints)  │
└──────────────┘    └──────────────┘    └──────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Auth Service │  │ Food Service │  │ Order Service│          │
│  │ Cache Svc    │  │ Cart Service │  │Analytics Svc │          │
│  │ Token Svc    │  │ Email Svc    │  │ Socket Svc   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATA & INFRASTRUCTURE                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  MongoDB 8   │  │   Redis 7    │  │   BullMQ     │          │
│  │ (Primary DB) │  │ (Cache+Rate) │  │ (Job Queue)  │          │
│  │  • Users     │  │  • Response  │  │  • Email     │          │
│  │  • Food      │  │    caching   │  │  • Analytics │          │
│  │  • Orders    │  │  • Rate      │  │  • Orders    │          │
│  │  • Sessions  │  │    limits    │  │  • Scheduled │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Socket.IO   │  │   ImageKit   │  │   Winston    │          │
│  │ (Real-time)  │  │  (Media CDN) │  │  (Logging)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## How Things Flow

### User Registration
```
Form → Validate (Joi) → Hash password (Argon2) → Save to MongoDB
→ Generate JWT → Create session → Queue welcome email → Set cookies
```

### Order Creation Flow
```
1. User places order (with CSRF token)
   ↓
2. Controller validates & checks auth
   ↓
3. Order Service creates order in DB
   ↓
4. Cache invalidation (user orders, partner orders)
   ↓
5. Queue jobs: Email confirmation, analytics tracking
   ↓
6. Socket.IO emits to food partner dashboard
   ↓
7. Response returned to user
```

### Food Browse Flow (Cached)
```
1. User requests food list
   ↓
2. Cache Service checks Redis
   ├─ HIT: Return cached response (< 50ms)
   └─ MISS: Query MongoDB
       ↓
       Save to Redis (TTL: 300s)
       ↓
       Return response (~200ms)
```

## Security

**Request flow:** Rate Limiter → CORS → JWT → CSRF → Controller

**Passwords:** Argon2id with 64MB memory cost (takes ~150ms to hash, prevents GPU attacks)

**Sessions:** Access token (15min JWT) + Refresh token (7 days, stored in MongoDB with IP/agent tracking)

## Caching

**TTLs:** Orders 60s, Search 180s, Food lists 300s, Profiles 600s

**Invalidation:** When you like/order/follow, relevant caches get nuked (learned the hard way that cache invalidation is one of the two hard problems in CS)

## Background Jobs

**Email queue:** Welcome emails, order confirmations  
**Order queue:** Process orders, notify partners  
**Analytics queue:** Track events (probably overkill)  
**Scheduled:** Session cleanup (daily 2am), cache warming (hourly)

### Worker Configuration
- **Concurrency**: 5 jobs per worker
- **Retry Strategy**: Exponential backoff (3 attempts)
- **Job Retention**: 1000 completed, 5000 failed (for debugging)

## Database Schema

### Core Collections

**users**
```javascript
{
  _id: ObjectId,
  fullName: String,
  email: String (unique),
  password: String (Argon2 hash),
  createdAt: Date,
  updatedAt: Date
}
```

**food**
```javascript
{
  _id: ObjectId,
  name: String,
  video: String (ImageKit URL),
  description: String,
  foodPartner: ObjectId (ref),
  likeCount: Number,
  savesCount: Number,
  commentCount: Number,
  isOrderable: Boolean,
  price: Number,
  createdAt: Date
}
// Indexes: {foodPartner: 1, isOrderable: 1}
```

**orders**
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref),
  food: ObjectId (ref) | items: Array,
  foodPartner: ObjectId (ref),
  quantity: Number,
  totalPrice: Number,
  deliveryAddress: String,
  status: Enum [pending, confirmed, preparing, ready, delivered, cancelled],
  paymentId: ObjectId (ref),
  createdAt: Date
}
// Indexes: {user: 1}, {foodPartner: 1}, {status: 1}
```

**sessions**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref),
  userType: Enum [User, FoodPartner],
  tokenHash: String (hashed refresh token),
  userAgent: String,
  ip: String,
  createdAt: Date,
  lastUsedAt: Date,
  expiresAt: Date
}
// TTL Index: {expiresAt: 1}
```

## WebSockets

Using Socket.IO for live order updates. Partners join room `partner:{id}`, get events when orders come in.

```javascript
// Server emits when new order
io.to(`partner:${partnerId}`).emit('order:created', orderData);

// Client listens and updates UI
socket.on('order:created', (data) => refetchOrders());
```

## Error Handling

**Layered validation:** Joi (400) → Auth (401) → Permissions (403) → Business logic → 500

**Response format:** `{success: false, message: "...", error: "CODE"}`

## Logging

Using Winston with JSON format, daily rotation, 14-day retention. Logs request latency, cache hits, queue jobs, DB times.

```javascript
logger.info('Order created', { orderId, userId, total, requestId });
```

## Deployment

**Dev:** Docker Compose with MongoDB/Redis containers + hot reload  
**Prod (conceptual):** Nginx → Backend (PM2) → MongoDB Atlas + Redis Cloud

## Performance

**Response times:** Cache hits ~50ms, misses ~200ms, uploads ~500ms, orders ~150ms

**Bottlenecks:** Single MongoDB/Redis instances (would need clustering for real scale), Socket.IO needs Redis adapter for multi-server

## Trade-offs Made

- **Argon2 vs bcrypt** - Better security, slightly slower (~100ms vs 50ms)
- **BullMQ** - Over-engineered for this, but learned a lot
- **Redis caching** - 90% less DB load, but cache invalidation is tricky
- **MongoDB** - Flexible schema, fast reads, but no transactions (until v4+)

## What's Missing

- Database migrations (schema changes are manual)
- Horizontal scaling (single instance only)
- WebSocket rate limiting
- CDN for static files
- Circuit breakers (cascading failures possible)

## If I Had More Time

Migrations tool, distributed tracing, deploy to actual cloud, GraphQL layer, proper monitoring
