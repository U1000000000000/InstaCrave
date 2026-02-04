const express = require('express');
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");
const validate = require('../middlewares/validate.middleware');
const { updateProfileSchema } = require('../validation/user.validation');
const { emptyQuerySchema, emptyParamsSchema, emptyBodySchema } = require('../validation/common.validation');
const { cacheMiddleware, invalidateCache, userCacheKey } = require('../middlewares/cache.middleware');


/**
 * @swagger
 * /api/v1/user:
 *   get:
 *     summary: Get current user profile
 *     tags: [User]
 *     description: |
 *       This endpoint is rate limited per user. Limits are dynamic based on user role:
 *         - Food partners: 5000 requests/hour
 *         - Regular users: 2000 requests/hour
 *
 *       Standard rate limit headers are returned:
 *         - X-RateLimit-Limit
 *         - X-RateLimit-Remaining
 *         - X-RateLimit-Reset
 *
 *       If the limit is exceeded, a 429 error is returned.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get("/",
    authMiddleware.authUserMiddleware,
    validate({ query: emptyQuerySchema, params: emptyParamsSchema, body: emptyBodySchema }),
    cacheMiddleware(300, (req) => {
        // Defensive: Handle case where req.user might not exist
        if (!req.user || !req.user._id) {
            return 'user:anonymous:profile';
        }
        return `user:${req.user._id}:profile`;
    }),
    userController.getUser
);

/**
 * @swagger
 * /api/v1/user/comments:
 *   get:
 *     summary: Get all comments made by the current user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       This endpoint is rate limited per user. Limits are dynamic based on user role:
 *       - Food partners: 5000 requests/hour
 *       - Regular users: 2000 requests/hour
 *
 *       Standard rate limit headers are returned:
 *       - X-RateLimit-Limit
 *       - X-RateLimit-Remaining
 *       - X-RateLimit-Reset
 *
 *       If the limit is exceeded, a 429 error is returned.
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 */
router.get("/comments",
    authMiddleware.authUserMiddleware,
    validate({ query: emptyQuerySchema, params: emptyParamsSchema, body: emptyBodySchema }),
    cacheMiddleware(300, (req) => {
        // Defensive: Handle case where req.user might not exist
        if (!req.user || !req.user._id) {
            return 'user:anonymous:comments';
        }
        return `user:${req.user._id}:comments`;
    }),
    userController.getComments
);

/**
 * @swagger
 * /api/v1/user/follows:
 *   get:
 *     summary: Get all food partners followed by the current user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       This endpoint is rate limited per user. Limits are dynamic based on user role:
 *       - Food partners: 5000 requests/hour
 *       - Regular users: 2000 requests/hour
 *
 *       Standard rate limit headers are returned:
 *       - X-RateLimit-Limit
 *       - X-RateLimit-Remaining
 *       - X-RateLimit-Reset
 *
 *       If the limit is exceeded, a 429 error is returned.
 *     responses:
 *       200:
 *         description: List of followed food partners
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FoodPartner'
 */
router.get("/follows",
    authMiddleware.authUserMiddleware,
    validate({ query: emptyQuerySchema, params: emptyParamsSchema, body: emptyBodySchema }),
    cacheMiddleware(300, (req) => {
        // Defensive: Handle case where req.user might not exist
        if (!req.user || !req.user._id) {
            return 'user:anonymous:follows';
        }
        return `user:${req.user._id}:follows`;
    }),
    userController.getFollowing
);

/**
 * @swagger
 * /api/v1/user/likes:
 *   get:
 *     summary: Get all liked foods by the current user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       This endpoint is rate limited per user. Limits are dynamic based on user role:
 *       - Food partners: 5000 requests/hour
 *       - Regular users: 2000 requests/hour
 *
 *       Standard rate limit headers are returned:
 *       - X-RateLimit-Limit
 *       - X-RateLimit-Remaining
 *       - X-RateLimit-Reset
 *
 *       If the limit is exceeded, a 429 error is returned.
 *     responses:
 *       200:
 *         description: List of liked foods
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Food'
 */
router.get("/likes",
    authMiddleware.authUserMiddleware,
    validate({ query: emptyQuerySchema, params: emptyParamsSchema, body: emptyBodySchema }),
    cacheMiddleware(300, (req) => {
        // Defensive: Handle case where req.user might not exist
        if (!req.user || !req.user._id) {
            return 'user:anonymous:likes';
        }
        return `user:${req.user._id}:likes`;
    }),
    userController.getLikes
);

/**
 * @swagger
 * /api/v1/user:
 *   patch:
 *     summary: Update current user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       This endpoint is rate limited per user. Limits are dynamic based on user role:
 *       - Food partners: 5000 requests/hour
 *       - Regular users: 2000 requests/hour
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
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Jane Doe
 *               password:
 *                 type: string
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Updated user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.patch("/",
    authMiddleware.authUserMiddleware,
    validate({ body: updateProfileSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
    invalidateCache(
        (req) => `user:${req.user._id}:*`
    ),
    userController.editUser
);

module.exports = router;