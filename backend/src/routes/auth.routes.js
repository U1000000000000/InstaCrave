const express = require('express');
const { loginLimiter, refreshLimiter } = require('../middlewares/rateLimiter.middleware');
const authController = require("../controllers/auth.controller")
const authMiddleware = require("../middlewares/auth.middleware");
const { upload, validateFileSignature } = require('../middlewares/fileUpload.middleware');
const validate = require('../middlewares/validate.middleware');
const { 
    registerUserSchema, 
    loginUserSchema, 
    registerFoodPartnerSchema, 
    loginFoodPartnerSchema 
} = require('../validation/auth.validation');
const { emptyQuerySchema, emptyParamsSchema } = require('../validation/common.validation');

const router = express.Router();




/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access and refresh tokens
 *     tags: [Auth]
 *     description: |
 *       This endpoint is rate limited per user/IP. Limits:
 *       - 10 requests/minute per user/IP
 *
 *       Standard rate limit headers are returned:
 *       - X-RateLimit-Limit
 *       - X-RateLimit-Remaining
 *       - X-RateLimit-Reset
 *
 *       If the limit is exceeded, a 429 error is returned.
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 */
router.post('/refresh-token', refreshLimiter, authController.refreshToken);


/**
 * @swagger
 * /api/v1/auth/user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     description: |
 *       This endpoint is rate limited per IP. Limits:
 *       - 10 requests/minute per IP
 *
 *       Standard rate limit headers are returned:
 *       - X-RateLimit-Limit
 *       - X-RateLimit-Remaining
 *       - X-RateLimit-Reset
 *
 *       If the limit is exceeded, a 429 error is returned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/user/register', validate({ body: registerUserSchema, query: emptyQuerySchema, params: emptyParamsSchema }), authController.registerUser);


/**
 * @swagger
 * /api/v1/auth/user/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     description: |
 *       This endpoint is rate limited per IP. Limits:
 *       - 10 requests/minute per IP
 *
 *       Standard rate limit headers are returned:
 *       - X-RateLimit-Limit
 *       - X-RateLimit-Remaining
 *       - X-RateLimit-Reset
 *
 *       If the limit is exceeded, a 429 error is returned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/user/login', validate({ body: loginUserSchema, query: emptyQuerySchema, params: emptyParamsSchema }), loginLimiter, authController.loginUser);


/**
 * @swagger
 * /api/v1/auth/user/logout:
 *   get:
 *     summary: Logout the current user
 *     tags: [Auth]
 *     description: |
 *       This endpoint is not individually rate limited, but is subject to the global rate limit for authenticated routes.
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User logged out successfully
 */
router.get('/user/logout', authController.logoutUser);

/**
 * @swagger
 * /api/v1/auth/food-partner/register:
 *   post:
 *     summary: Register a new food partner
 *     tags: [Auth]
 *     description: |
 *       This endpoint is rate limited per IP. Limits:
 *       - 10 requests/minute per IP
 *
 *       Standard rate limit headers are returned:
 *       - X-RateLimit-Limit
 *       - X-RateLimit-Remaining
 *       - X-RateLimit-Reset
 *
 *       If the limit is exceeded, a 429 error is returned.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - profile
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pizza Place
 *               email:
 *                 type: string
 *                 example: pizza@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               profile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Food partner registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodPartner'
 *           encoding:
 *             profile:
 *               contentType: ["image/jpeg", "image/png", "video/mp4"]
 *               description: |
 *                 File upload for food partner profile image or video. Max size: 10MB. Only JPEG, PNG, and MP4 allowed. File signature is validated for security.
 */
router.post(
    '/food-partner/register',
    upload.single('profile'),
    validateFileSignature,
    validate({ body: registerFoodPartnerSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
    authController.registerFoodPartner
);

/**
 * @swagger
 * /api/v1/auth/food-partner/login:
 *   post:
 *     summary: Login a food partner
 *     tags: [Auth]
 *     description: |
 *       This endpoint is rate limited per IP. Limits:
 *       - 10 requests/minute per IP
 *
 *       Standard rate limit headers are returned:
 *       - X-RateLimit-Limit
 *       - X-RateLimit-Remaining
 *       - X-RateLimit-Reset
 *
 *       If the limit is exceeded, a 429 error is returned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: pizza@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Food partner logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodPartner'
 */
router.post('/food-partner/login', validate({ body: loginFoodPartnerSchema, query: emptyQuerySchema, params: emptyParamsSchema }), loginLimiter, authController.loginFoodPartner);

/**
 * @swagger
 * /api/v1/auth/food-partner/logout:
 *   get:
 *     summary: Logout the current food partner
 *     tags: [Auth]
 *     description: |
 *       This endpoint is not individually rate limited, but is subject to the global rate limit for authenticated routes.
 *     responses:
 *       200:
 *         description: Food partner logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Food partner logged out successfully
 */
router.get('/food-partner/logout', authController.logoutFoodPartner);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user or food partner
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       This endpoint is not individually rate limited, but is subject to the global rate limit for authenticated routes.
 *     responses:
 *       200:
 *         description: Current user or food partner
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/User'
 *                 - $ref: '#/components/schemas/FoodPartner'
 */
router.get('/me', authMiddleware.authAnyMiddleware, authController.getCurrentUser);

/**
 * @swagger
 * /api/v1/auth/sessions:
 *   get:
 *     summary: List active sessions for current user (per-device/session management)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       This endpoint is not individually rate limited, but is subject to the global rate limit for authenticated routes.
 *     responses:
 *       200:
 *         description: Active sessions listed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Session'
 *                 message:
 *                   type: string
 *                   example: Active sessions listed successfully
 */
router.get('/sessions', authMiddleware.authAnyMiddleware, authController.listSessions);

/**
 * @swagger
 * /api/v1/auth/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a session by sessionId (logout from device)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       This endpoint is not individually rate limited, but is subject to the global rate limit for authenticated routes.
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The session ID to revoke
 *     responses:
 *       200:
 *         description: Session revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Session revoked successfully
 */
router.delete('/sessions/:sessionId', authMiddleware.authAnyMiddleware, authController.revokeSession);

module.exports = router;