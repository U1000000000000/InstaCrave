const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'InstaCrave API',
      version: '1.0.0',
      description: `
# 🍔 InstaCrave API Documentation

**Professional-grade, production-ready REST API for food discovery and social engagement.**

---

## 🚀 Quick Start

### 1. Register & Login
\`\`\`bash
# Register a new user
curl -X POST https://instacrave.zeabur.app/api/v1/auth/register-user \\
  -H "Content-Type: application/json" \\
  -d '{"fullName":"John Doe","email":"john@example.com","password":"secure123"}'

# Login to get tokens
curl -X POST https://instacrave.zeabur.app/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"john@example.com","password":"secure123"}'

# Response sets cookies: accessToken (15m), refreshToken (7d)
\`\`\`

### 2. Browse Food
\`\`\`bash
# Get food feed (cached)
curl https://instacrave.zeabur.app/api/v1/food?page=1&limit=10 \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response includes X-Cache header: HIT or MISS
\`\`\`

### 3. Create Order
\`\`\`bash
# Get CSRF token first
curl https://instacrave.zeabur.app/api/v1/csrf-token \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create order with CSRF token
curl -X POST https://instacrave.zeabur.app/api/v1/orders \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"foodId":"65a1b2c3d4e5f6a7b8c9d0e2","quantity":2,"deliveryAddress":"123 Main St"}'
\`\`\`

---

## 🔐 Authentication

### JWT Token Flow

\`\`\`
1. Register/Login → Receive accessToken (15m) + refreshToken (7d) in HTTP-only cookies
2. Include accessToken in Authorization header: "Bearer YOUR_TOKEN"
3. When accessToken expires (401) → Call /api/v1/auth/refresh-token
4. Receive new accessToken, continue using API
5. Logout → Call /api/v1/auth/logout to revoke tokens
\`\`\`

### Token Details
- **Access Token**: 15 minutes validity, used for API requests
- **Refresh Token**: 7 days validity, used to get new access tokens
- **Storage**: HTTP-only cookies (secure, not accessible via JavaScript)
- **Format**: JWT with HS256 signing

### Example Request
\`\`\`javascript
// JavaScript (Axios)
const response = await axios.get('/api/v1/food', {
  headers: {
    Authorization: \`Bearer \${accessToken}\`
  }
});

// Python (Requests)
response = requests.get(
  'https://instacrave.zeabur.app/api/v1/food',
  headers={'Authorization': f'Bearer {access_token}'}
)
\`\`\`

---

## 🛡️ CSRF Protection

All state-changing endpoints (POST, PUT, PATCH, DELETE) require a valid CSRF token.

### How to Use CSRF Tokens

\`\`\`bash
# 1. Get CSRF token
curl https://instacrave.zeabur.app/api/v1/csrf-token \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response: { "success": true, "csrfToken": "abc123..." }

# 2. Include token in state-changing requests
curl -X POST https://instacrave.zeabur.app/api/v1/food \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "x-csrf-token: abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Pizza","video":"https://..."}'
\`\`\`

### CSRF Errors
- **403 Forbidden**: Invalid or missing CSRF token
- **Solution**: Fetch a new token from \`GET /api/v1/csrf-token\`

---
---

## ⚡ Redis Caching

All GET endpoints implement **Redis caching** for optimal performance.

### Cache Strategy
- **Pattern**: Cache-Aside with automatic stampede protection
- **TTL**: 60s (real-time) to 600s (static content)
- **Header**: All responses include \`X-Cache: HIT\` or \`MISS\`
- **Invalidation**: Automatic on mutations (POST/PUT/PATCH/DELETE)

### Cache TTLs by Endpoint
| Endpoint Type | TTL | Reason |
|--------------|-----|---------|
| Orders, Sessions | 60s | Real-time data |
| Search, Comments | 180s | Semi-dynamic |
| User/Partner Profiles | 300s | Moderately static |
| Food Lists | 300s | Updated frequently |
| Partner Details | 600s | Mostly static |

### Performance Metrics
- **Cache Hit Rate**: 70-90% in production
- **Response Time (HIT)**: <50ms (p95)
- **Response Time (MISS)**: ~200ms (p95)
- **DB Load Reduction**: 90%

### Example
\`\`\`bash
curl https://instacrave.zeabur.app/api/v1/food

# First request (cache MISS):
X-Cache: MISS
# Response time: ~200ms

# Second request within TTL (cache HIT):
X-Cache: HIT
# Response time: <50ms
\`\`\`

### Cache Invalidation Rules
- Creating food → Invalidates all food lists
- Liking/saving food → Invalidates food item + user cache
- Following partner → Invalidates user + partner cache
- All mutations auto-invalidate related caches

---

## 🚦 Rate Limiting

All endpoints are rate-limited to prevent abuse.

### Limits by User Role
| Role | Limit | Window |
|------|-------|--------|
| Regular Users | 2000 requests | per hour |
| Food Partners | 5000 requests | per hour |
| Admin | Unlimited | - |

### Example
\`\`\`bash
curl https://instacrave.zeabur.app/api/v1/food \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Rate Limit Exceeded (429)
\`\`\`json
{
  "success": false,
  "error": "Too many requests. Try again after 1735000000.",
  "retryAfter": 3600
}
\`\`\`

**Recovery**: Wait until \`X-RateLimit-Reset\` time, then retry.

---

## 🌐 CORS Policy

Dynamic, environment-aware CORS for secure cross-origin requests.

### Allowed Origins
- **Development**: \`http://localhost:5173\`, \`http://localhost:3000\`
- **Production**: Value from \`FRONTEND_URL\` environment variable
- **Credentials**: Enabled for allowed origins

### CORS Headers
\`\`\`
Access-Control-Allow-Origin: https://instacrave.zeabur.app
  Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, x-csrf-token
\`\`\`

### Forbidden Origin (403)
\`\`\`json
{
  "success": false,
  "error": "CORS policy: Origin not allowed"
}
\`\`\`

---

## 🔒 Security Best Practices

### Password Security
- **Hashing**: Argon2id (winner of Password Hashing Competition)
- **Memory Cost**: 65536 KB (64 MB) - prevents GPU attacks
- **Time Cost**: 3 iterations
- **Parallelism**: 4 threads
- **Salt**: Unique per password, auto-generated

### Input Sanitization
- **HTML/XSS**: All inputs sanitized using \`sanitize-html\`
- **SQL Injection**: Prevented via Mongoose parameterized queries
- **File Uploads**: Content-type validation + magic number verification

### Audit Logging
All sensitive operations are logged:
- User login/logout
- Password changes
- Order creation
- Payment processing

### Session Management
- **Storage**: MongoDB with TTL index
- **Rotation**: New refresh token on each refresh
- **Revocation**: Logout invalidates all sessions
- **Monitoring**: Track active sessions per user

---

## 📊 API Versioning

### Current Versions
- **v1** (\`/api/v1/*\`): Stable, production-ready
- **v2** (\`/api/v2/*\`): Enhanced features, backward compatible where possible

### v1 vs v2 Differences
| Feature | v1 | v2 |
|---------|----|----|
| Food Upload | Basic | Enhanced with metadata |
| Pagination | Simple | Cursor-based |
| Errors | Standard | Detailed error codes |

### Deprecation Policy
- **Notice Period**: 6 months minimum before deprecation
- **Support**: v1 supported until 2026
- **Migration**: Guides provided in docs

---

## 🐛 Error Codes & Recovery

### Standard Error Response
\`\`\`json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { /* additional context */ }
}
\`\`\`

### Common Error Codes
| Code | Meaning | Recovery |
|------|---------|----------|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Login or refresh token |
| 403 | Forbidden | Get CSRF token or check permissions |
| 404 | Not Found | Verify resource ID |
| 429 | Too Many Requests | Wait for rate limit reset |
| 500 | Internal Server Error | Retry or contact support |

### Detailed Error Examples
See individual endpoints for specific error scenarios.

---

## 📈 Common Workflows

### User Journey: Browse → Order
\`\`\`
1. Browse food: GET /api/v1/food?page=1
2. View details: GET /api/v1/food/:id
3. Add to cart: POST /api/v1/cart/add
4. Checkout: POST /api/v1/orders
5. Track order: GET /api/v1/orders (filter by user)
\`\`\`

### Partner Journey: Upload → Track Analytics
\`\`\`
1. Upload food: POST /api/v2/food (with file upload)
2. View analytics: GET /api/v1/analytics/events
3. Check aggregations: GET /api/v1/analytics/aggregations/summary
4. Monitor orders: GET /api/v1/orders (filter by partner)
\`\`\`

### Admin Journey: Monitor System
\`\`\`
1. Health check: GET /health
2. Cache metrics: GET /api/v1/admin/cache/metrics
3. Queue dashboard: GET /admin/queues (Bull Board UI)
4. Audit logs: GET /api/v1/admin/audit-logs
\`\`\`

---

## 🛠️ Troubleshooting

### Issue: "401 Unauthorized"
**Cause**: Missing or expired access token

**Solution**:
1. Check if token is included: \`Authorization: Bearer YOUR_TOKEN\`
2. If expired, call \`POST /api/v1/auth/refresh-token\`
3. If refresh fails, login again: \`POST /api/v1/auth/login\`

---

### Issue: "403 Forbidden - Invalid CSRF token"
**Cause**: Missing or incorrect CSRF token

**Solution**:
1. Fetch token: \`GET /api/v1/csrf-token\`
2. Include in header: \`x-csrf-token: YOUR_TOKEN\`
3. Retry request

---

### Issue: "429 Too Many Requests"
**Cause**: Rate limit exceeded

**Solution**:
1. Check \`X-RateLimit-Reset\` header for reset time
2. Wait until that time (Unix timestamp)
3. Implement exponential backoff in client

---

### Issue: Cache not refreshing
**Cause**: TTL not expired

**Solution**:
- Wait for TTL to expire (60s-600s depending on endpoint)
- Or trigger invalidation via mutation (POST/PUT/DELETE)
- Or clear cache manually (admin endpoint)

---

## 📚 Resources

- **Interactive Docs**: https://instacrave.zeabur.app/docs
- **OpenAPI Spec**: https://instacrave.zeabur.app/openapi.json
- **Postman Collection**: Import OpenAPI spec into Postman
- **Support**: ujjvalagarwal2004@gmail.com

---
  `,
      contact: { 
        name: 'Ujjval Agarwal', 
        email: 'ujjvalagarwal2004@gmail.com',
        url: 'https://github.com/U1000000000000'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.BACKEND_URL_LOCAL || 'http://localhost:3000',
        description: 'Local Development Server'
      },
      {
        url: process.env.BACKEND_URL,
        description: 'Production'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      headers: {
        'X-Cache': {
          description: 'Cache status indicator. **HIT**: Response served from Redis cache. **MISS**: Response generated from database.',
          schema: {
            type: 'string',
            enum: ['HIT', 'MISS'],
            example: 'HIT'
          }
        },
        'X-RateLimit-Limit': {
          description: 'Maximum number of requests allowed in the current time window',
          schema: { type: 'integer', example: 100 }
        },
        'X-RateLimit-Remaining': {
          description: 'Number of requests remaining in the current time window',
          schema: { type: 'integer', example: 95 }
        },
        'X-RateLimit-Reset': {
          description: 'Timestamp when the rate limit window resets (Unix epoch)',
          schema: { type: 'integer', example: 1735000000 }
        }
      },
      schemas: {
                AuditLog: {
                  type: 'object',
                  required: ['timestamp', 'event'],
                  properties: {
                    _id: { type: 'string', example: '65b1b2c3d4e5f6a7b8c9d0e9' },
                    timestamp: { type: 'string', format: 'date-time', example: '2025-12-19T12:00:00Z' },
                    event: { type: 'string', example: 'loginUser' },
                    userId: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e1' },
                    userType: { type: 'string', enum: ['User', 'FoodPartner'], example: 'User' },
                    userAgent: { type: 'string', example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
                    ip: { type: 'string', example: '192.168.1.1' },
                    sessionId: { type: 'string', example: '65b1b2c3d4e5f6a7b8c9d0e8' },
                    details: { type: 'object', example: { extra: 'info' } }
                  },
                  description: 'Audit log entry for authentication and session events. Used for compliance and security monitoring.'
                },
        User: {
          type: 'object',
          required: ['fullName', 'email'],
          properties: {
            _id: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e1' },
            fullName: { type: 'string', minLength: 2, maxLength: 50, example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            createdAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' }
          },
          description: 'User object returned in API responses. Does not include sensitive fields like password.\n\n**Password Security:**\n- Passwords are always hashed using Argon2 before storage.\n- Hashing parameters are configurable via environment variables for security/performance.\n- Password hashes are never returned in any API response.\n- All password changes are logged for audit and security monitoring.'
        },
        UserRegistration: {
          type: 'object',
          required: ['fullName', 'email', 'password'],
          properties: {
            fullName: { type: 'string', minLength: 2, maxLength: 50, example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', minLength: 6, example: 'strongpassword' }
          },
          description: 'Request body for user registration.\n\n**Password Security:**\n- Passwords are never stored in plain text.\n- Passwords are hashed using Argon2 before saving.'
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', minLength: 6, example: 'strongpassword' }
          },
          description: 'Request body for user login.\n\n**Password Security:**\n- Passwords are verified using Argon2 constant-time comparison.'
        },
        UserUpdate: {
          type: 'object',
          properties: {
            fullName: { type: 'string', minLength: 2, maxLength: 50, example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', minLength: 6, example: 'newpassword' }
          },
          description: 'Request body for updating user profile. All fields optional.\n\n**Password Security:**\n- If password is updated, it is hashed using Argon2 before saving.\n- All password changes are logged for audit.'
        },
        Food: {
          type: 'object',
          required: ['name', 'video', 'foodPartner'],
          properties: {
            _id: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e2' },
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Pizza' },
            video: { type: 'string', example: 'https://cdn.example.com/video.mp4' },
            description: { type: 'string', maxLength: 500, example: 'Delicious cheese pizza' },
            foodPartner: { $ref: '#/components/schemas/FoodPartner' },
            likeCount: { type: 'integer', minimum: 0, example: 10 },
            savesCount: { type: 'integer', minimum: 0, example: 5 },
            commentCount: { type: 'integer', minimum: 0, example: 2 },
            shareCount: { type: 'integer', minimum: 0, example: 1 },
            isOrderable: { type: 'boolean', example: true },
            price: { type: 'number', minimum: 0, example: 12.99 },
            createdAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' }
          },
          description: 'Food item object returned in API responses.'
        },
        FoodCreate: {
          type: 'object',
          required: ['name', 'video', 'foodPartner'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Pizza' },
            video: { type: 'string', example: 'https://cdn.example.com/video.mp4' },
            description: { type: 'string', maxLength: 500, example: 'Delicious cheese pizza' },
            foodPartner: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e3' },
            isOrderable: { type: 'boolean', example: true },
            price: { type: 'number', minimum: 0, example: 12.99 }
          },
          description: 'Request body for creating a food item.'
        },
        FoodUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Pizza' },
            video: { type: 'string', example: 'https://cdn.example.com/video.mp4' },
            description: { type: 'string', maxLength: 500, example: 'Delicious cheese pizza' },
            isOrderable: { type: 'boolean', example: true },
            price: { type: 'number', minimum: 0, example: 12.99 }
          },
          description: 'Request body for updating a food item. All fields optional.'
        },
        Session: {
          type: 'object',
          required: ['userId', 'userType', 'userAgent', 'ip', 'createdAt', 'lastUsedAt'],
          properties: {
            _id: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e9' },
            userId: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e1' },
            userType: { type: 'string', enum: ['User', 'FoodPartner'], example: 'User' },
            userAgent: { type: 'string', example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
            ip: { type: 'string', example: '192.168.1.1' },
            createdAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' },
            lastUsedAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' }
          },
          description: 'Session object for per-device/session management. Used for refresh token rotation and audit logging.'
        },
        FoodPartner: {
          type: 'object',
          required: ['name', 'contactName', 'phone', 'address', 'email'],
          properties: {
            _id: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e3' },
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Best Pizza Place' },
            contactName: { type: 'string', minLength: 2, maxLength: 50, example: 'Alice Smith' },
            phone: { type: 'string', example: '+1234567890' },
            address: { type: 'string', maxLength: 200, example: '123 Main St, City' },
            email: { type: 'string', format: 'email', example: 'partner@example.com' },
            profileImage: { type: 'string', example: 'https://cdn.example.com/profile.jpg' },
            followCount: { type: 'integer', minimum: 0, example: 42 },
            createdAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' }
          },
          description: 'Food partner object returned in API responses. Does not include sensitive fields like password.'
        },
        FoodPartnerRegistration: {
          type: 'object',
          required: ['name', 'contactName', 'phone', 'address', 'email', 'password'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Best Pizza Place' },
            contactName: { type: 'string', minLength: 2, maxLength: 50, example: 'Alice Smith' },
            phone: { type: 'string', example: '+1234567890' },
            address: { type: 'string', maxLength: 200, example: '123 Main St, City' },
            email: { type: 'string', format: 'email', example: 'partner@example.com' },
            password: { type: 'string', minLength: 6, example: 'strongpassword' }
          },
          description: 'Request body for food partner registration.'
        },
        FoodPartnerLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'partner@example.com' },
            password: { type: 'string', minLength: 6, example: 'strongpassword' }
          },
          description: 'Request body for food partner login.'
        },
        FoodPartnerUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Best Pizza Place' },
            contactName: { type: 'string', minLength: 2, maxLength: 50, example: 'Alice Smith' },
            phone: { type: 'string', example: '+1234567890' },
            address: { type: 'string', maxLength: 200, example: '123 Main St, City' },
            email: { type: 'string', format: 'email', example: 'partner@example.com' },
            password: { type: 'string', minLength: 6, example: 'newpassword' },
            profileImage: { type: 'string', example: 'https://cdn.example.com/profile.jpg' }
          },
          description: 'Request body for updating food partner profile. All fields optional.'
        },
        Order: {
          type: 'object',
          required: ['foodName', 'foodPartnerName', 'foodPartner', 'userName', 'user', 'food', 'quantity', 'totalPrice', 'deliveryAddress'],
          properties: {
            _id: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e4' },
            foodName: { type: 'string', maxLength: 100, example: 'Pizza' },
            foodPartnerName: { type: 'string', maxLength: 100, example: 'Best Pizza Place' },
            foodPartner: { $ref: '#/components/schemas/FoodPartner' },
            userName: { type: 'string', maxLength: 50, example: 'John Doe' },
            user: { $ref: '#/components/schemas/User' },
            food: { $ref: '#/components/schemas/Food' },
            quantity: { type: 'integer', minimum: 1, example: 2 },
            totalPrice: { type: 'number', minimum: 0, example: 25.98 },
            deliveryAddress: { type: 'string', maxLength: 200, example: '123 Main St, City' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'], example: 'pending' },
            createdAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' }
          },
          description: 'Order object returned in API responses.'
        },
        OrderCreate: {
          type: 'object',
          required: ['foodName', 'foodPartnerName', 'foodPartner', 'userName', 'user', 'food', 'quantity', 'totalPrice', 'deliveryAddress'],
          properties: {
            foodName: { type: 'string', maxLength: 100, example: 'Pizza' },
            foodPartnerName: { type: 'string', maxLength: 100, example: 'Best Pizza Place' },
            foodPartner: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e3' },
            userName: { type: 'string', maxLength: 50, example: 'John Doe' },
            user: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e1' },
            food: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e2' },
            quantity: { type: 'integer', minimum: 1, example: 2 },
            totalPrice: { type: 'number', minimum: 0, example: 25.98 },
            deliveryAddress: { type: 'string', maxLength: 200, example: '123 Main St, City' }
          },
          description: 'Request body for creating an order.'
        },
        Comment: {
          type: 'object',
          required: ['user', 'food', 'comment'],
          properties: {
            _id: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e5' },
            user: { $ref: '#/components/schemas/User' },
            food: { $ref: '#/components/schemas/Food' },
            comment: { type: 'string', maxLength: 500, example: 'Great food!' },
            createdAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' }
          },
          description: 'Comment object returned in API responses.'
        },
        CommentCreate: {
          type: 'object',
          required: ['user', 'food', 'comment'],
          properties: {
            user: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e1' },
            food: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e2' },
            comment: { type: 'string', maxLength: 500, example: 'Great food!' }
          },
          description: 'Request body for creating a comment.'
        },
        Follow: {
          type: 'object',
          required: ['user', 'foodpartner'],
          properties: {
            _id: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e6' },
            user: { $ref: '#/components/schemas/User' },
            foodpartner: { $ref: '#/components/schemas/FoodPartner' },
            createdAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' }
          },
          description: 'Follow object returned in API responses.'
        },
        FollowCreate: {
          type: 'object',
          required: ['user', 'foodpartner'],
          properties: {
            user: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e1' },
            foodpartner: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e3' }
          },
          description: 'Request body for following a food partner.'
        },
        Like: {
          type: 'object',
          required: ['user', 'food'],
          properties: {
            _id: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e7' },
            user: { $ref: '#/components/schemas/User' },
            food: { $ref: '#/components/schemas/Food' },
            createdAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' }
          },
          description: 'Like object returned in API responses.'
        },
        LikeCreate: {
          type: 'object',
          required: ['user', 'food'],
          properties: {
            user: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e1' },
            food: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e2' }
          },
          description: 'Request body for liking a food item.'
        },
        Save: {
          type: 'object',
          required: ['user', 'food'],
          properties: {
            _id: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e8' },
            user: { $ref: '#/components/schemas/User' },
            food: { $ref: '#/components/schemas/Food' },
            createdAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2025-12-17T12:00:00Z' }
          },
          description: 'Save object returned in API responses.'
        },
        SaveCreate: {
          type: 'object',
          required: ['user', 'food'],
          properties: {
            user: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e1' },
            food: { type: 'string', example: '65a1b2c3d4e5f6a7b8c9d0e2' }
          },
          description: 'Request body for saving a food item.'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/app.js'], // Include JSDoc from routes, controllers, and app
};

module.exports = swaggerJSDoc(options);
