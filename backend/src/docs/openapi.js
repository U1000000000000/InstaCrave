const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'InstaCrave API',
      version: '1.0.0',
      description: `Advanced, versioned API for InstaCrave. All endpoints require authentication unless noted.\n\n
## CSRF Protection

All state-changing endpoints (POST, PUT, PATCH, DELETE) require a valid CSRF token.\n

**Example:**

\`
POST /api/v1/food
Headers:
  x-csrf-token: <token from /api/v1/csrf-token>
\`

`,
        description: `Advanced, versioned API for InstaCrave. All endpoints require authentication unless noted.\n\n
  ## CORS Policy (Industry-Leading)

  All API endpoints enforce a dynamic, environment-aware CORS policy:
  - Only requests from trusted origins (see FRONTEND_URL and allowlist) are allowed.
  - Credentials (cookies, auth headers) are only sent for allowed origins.
  - All CORS decisions are logged for security auditing.
  - Preflight (OPTIONS) requests are handled securely and efficiently.
  - Forbidden origins receive a clear 403 error with a descriptive message.
  - Wildcard subdomain support is available for enterprise use cases.

  **How to Use:**
  - Set your frontend's origin in the environment variable FRONTEND_URL.
  - For local development, http://localhost:5173 is always allowed.
  - If you need to allow more origins, add them to the allowlist in the backend CORS middleware.

  **Example:**
  \`
  Origin: https://app.instacrave.com
  Access-Control-Allow-Origin: https://app.instacrave.com
  Access-Control-Allow-Credentials: true
  \`

  ## CSRF Protection

  All state-changing endpoints (POST, PUT, PATCH, DELETE) require a valid CSRF token.\n
  - Obtain a CSRF token by calling \`GET /api/v1/csrf-token\`.\n+- Send the token in the \`x-csrf-token\` header for all state-changing requests.\n+- If the token is missing or invalid, a 403 error is returned.\n+- The CSRF token is also set as a cookie (\`XSRF-TOKEN\`) for convenience.\n+- See the \`/api/v1/csrf-token\` endpoint for details.\n
  **Example:**
  \`
  POST /api/v1/food
  Headers:
    x-csrf-token: <token from /api/v1/csrf-token>
  \`

  `,
      contact: { name: 'Ujjval Agarwal', email: 'ujjvalagarwal2004@gmail.com' }
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local' },
      { url: 'https://instacrave.zeabur.app', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
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
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // JSDoc comments in code
};

module.exports = swaggerJSDoc(options);
