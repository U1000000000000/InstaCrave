const express = require('express');
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { listSessions, revokeSession } = require('../controllers/auth.controller');
const userController = require("../controllers/user.controller");
const validate = require('../middlewares/validate.middleware');
const { updateProfileSchema } = require('../validation/user.validation');
const { emptyQuerySchema, emptyParamsSchema, emptyBodySchema } = require('../validation/common.validation');


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
    userController.editUser
);

/**
 * @swagger
 * /api/v1/user/sessions:
 *   get:
 *     summary: List active sessions for current user (per-device/session management)
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
router.get('/sessions', authMiddleware.authUserMiddleware, listSessions);

/**
 * @swagger
 * /api/v1/auth/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke a session by sessionId (logout from device)
 *     tags: [Auth]
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
router.delete('/sessions/:sessionId', authMiddleware.authUserMiddleware, revokeSession);

module.exports = router;