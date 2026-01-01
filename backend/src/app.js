// create server
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const foodRoutes = require('./routes/food.routes');
const foodV2Routes = require('./routes/food.v2.routes');
const foodPartnerRoutes = require('./routes/food-partner.routes');
const searchRoutes = require('./routes/search.routes');
const userRoutes = require('./routes/user.routes');
const orderRoutes = require('./routes/order.routes');
const errorHandler = require('./middlewares/error.middleware');
const csrfProtection = require('./middlewares/csrf.middleware');
const { globalLimiter, userLimiter } = require('./middlewares/rateLimiter.middleware');
const setupSwaggerDocs = require('./docs/swagger-setup');

// Remove default cors, use advanced CORS middleware
const advancedCors = require('./middlewares/advancedCors.middleware');


const app = express();

// If behind a proxy/load balancer (e.g., Heroku, AWS ELB), trust proxy for correct IP limiting
app.set('trust proxy', 1);


// Use advanced, dynamic, industry-grade CORS middleware
app.use(advancedCors);


app.use(cookieParser());
app.use(express.json());

// CSRF protection for all state-changing routes

/**
 * @swagger
 * /api/v1/csrf-token:
 *   get:
 *     summary: Get CSRF token for frontend
 *     tags: [Security]
 *     description: |
 *       Returns a CSRF token for use in state-changing requests. The token is set as a cookie (XSRF-TOKEN) and returned in the response body. 
 *       \n**CSRF Protection Requirements:**
 *         - All POST, PUT, PATCH, DELETE requests to protected endpoints require a valid CSRF token.
 *         - The frontend must fetch this token and send it in the `x-csrf-token` header for all state-changing requests.
 *         - The CSRF token is valid for the current session and user.
 *         - If the token is missing or invalid, a 403 error is returned.
 *     responses:
 *       200:
 *         description: CSRF token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 *                   example: "abc123csrf..."
 *       429:
 *         description: Too many requests (rate limited)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Too many requests from this IP, please try again later."
 */
app.get('/api/v1/csrf-token', globalLimiter, csrfProtection, (req, res) => {
    res.cookie('XSRF-TOKEN', req.csrfToken(), {
        httpOnly: false,
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        secure: process.env.NODE_ENV === 'production',
    });
    res.status(200).json({ csrfToken: req.csrfToken() });
});

// Only apply CSRF protection to authenticated, state-changing routes
const csrfProtectedRoutes = [
    '/api/v1/food',
    '/api/v2/food',
    '/api/v1/food-partner',
    '/api/v1/user',
    '/api/v1/orders',
];
csrfProtectedRoutes.forEach((route) => {
    app.use(route, csrfProtection);
});

// Apply global rate limiter only to public endpoints
app.use('/api/v1/auth', globalLimiter);
app.use('/api/v1/search', globalLimiter);

app.get("/", (req, res) => {
    res.send("Hello World");
})

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/food', userLimiter(), foodRoutes);
app.use('/api/v2/food', userLimiter(), foodV2Routes);
app.use('/api/v1/food-partner', userLimiter(), foodPartnerRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/user', userLimiter(), userRoutes);
app.use('/api/v1/orders', userLimiter(), orderRoutes);

// Advanced Swagger/OpenAPI docs (industry-leading)
setupSwaggerDocs(app);


// Centralized error handler (must be after all routes and docs)
app.use(errorHandler);

module.exports = app;
