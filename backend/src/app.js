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
const cartRoutes = require('./routes/cart.routes');
const paymentRoutes = require('./routes/payment.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const errorHandler = require('./middlewares/error.middleware');
const csrfProtection = require('./middlewares/csrf.middleware');
const { globalLimiter, userLimiter } = require('./middlewares/rateLimiter.middleware');
const setupSwaggerDocs = require('./docs/swagger-setup');
const csrf = require('csurf');
const requestIdMiddleware = require('./middlewares/requestId.middleware');
const advancedCors = require('./middlewares/advancedCors.middleware');
const { setupBullBoard } = require('./queue/monitoring/bull-board.setup');


const app = express();

// If behind a proxy/load balancer (e.g., Heroku, AWS ELB), trust proxy for correct IP limiting
app.set('trust proxy', 1);

// Explicitly allow/deny origins (tests expect 403 for unauthorized origins)
app.use(advancedCors);


app.use(cookieParser());
app.use(express.json());

// Request tracing + request-scoped logger (req.logger)
app.use(requestIdMiddleware);

// CSRF protection for all state-changing routes

// Expose CSRF token to frontend (no CSRF required)
/**
 * @swagger
 * /api/v1/csrf-token:
 *   get:
 *     summary: Get CSRF token
 *     tags: [Security]
 *     description: |
 *       Returns a CSRF token to be included in state-changing requests.
 *
 *       This API uses cookie-based CSRF protection (csurf). The server stores
 *       a CSRF secret in an HTTP-only cookie, and the client must send the
 *       generated token in the `x-csrf-token` header for POST/PUT/PATCH/DELETE.
 *
 *       Note: This endpoint does not require a CSRF token.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSRF token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 */
app.get('/api/v1/csrf-token', (req, res) => {
    // Use cookie-based csurf (same mechanism as csrf.middleware.js)
    const csrfMiddleware = csrf({
        cookie: {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            secure: process.env.NODE_ENV === 'production',
        },
    });

    csrfMiddleware(req, res, () => {
        const token = req.csrfToken();

        // Do not cache CSRF tokens
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({ csrfToken: token });
    });
});

// Only apply CSRF protection to authenticated, state-changing routes
const csrfProtectedRoutes = [
    '/api/v1/food',
    '/api/v2/food',
    '/api/v1/food-partner',
    '/api/v1/user',
    '/api/v1/orders',
    '/api/v1/cart',
    '/api/v1/payments',
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

// Cart + Payments + Analytics
app.use('/api/v1/cart', userLimiter(), cartRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Swagger/OpenAPI documentation
setupSwaggerDocs(app);

// Bull Board Queue Monitoring Dashboard
setupBullBoard(app);


// Centralized error handler (must be after all routes and docs)
app.use(errorHandler);

// Startup check for critical env vars in production
if (process.env.NODE_ENV === 'production') {
  const missing = [];
  if (!process.env.ARGON2_MEMORY_COST) missing.push('ARGON2_MEMORY_COST');
  if (!process.env.ARGON2_TIME_COST) missing.push('ARGON2_TIME_COST');
  if (!process.env.ARGON2_PARALLELISM) missing.push('ARGON2_PARALLELISM');
  if (!process.env.REDIS_HOST) missing.push('REDIS_HOST');
  if (!process.env.REDIS_PORT) missing.push('REDIS_PORT');
  if (!process.env.REDIS_PASSWORD) missing.push('REDIS_PASSWORD');
  if (missing.length > 0) {
    throw new Error('Missing required environment variables in production: ' + missing.join(', '));
  }
}

module.exports = app;
