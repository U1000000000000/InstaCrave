const express = require('express');
const foodPartnerController = require("../controllers/food-partner.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { listSessions, revokeSession } = require('../controllers/auth.controller');
const { upload, validateFileSignature } = require('../middlewares/fileUpload.middleware');
const validate = require('../middlewares/validate.middleware');
const { editFoodPartnerSchema } = require('../validation/food-partner.validation');
const { objectIdSchema, emptyQuerySchema, emptyParamsSchema, emptyBodySchema } = require('../validation/common.validation');
const { followFoodPartnerSchema } = require('../validation/follow.validation');

const router = express.Router();



/**
 * @swagger
 * /api/v1/food-partner/{id}:
 *   get:
 *     summary: Get food partner by ID
 *     tags: [FoodPartner]
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
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Food partner ID
 *     responses:
 *       200:
 *         description: Food partner retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/FoodPartner'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Food partner not found
 */

router.get(
    "/:id",
    authMiddleware.authUserMiddleware,
    validate({ params: objectIdSchema, query: emptyQuerySchema, body: emptyBodySchema }),
    foodPartnerController.getFoodPartnerById
)


/**
 * @swagger
 * /api/v1/food-partner:
 *   get:
 *     summary: Get current food partner profile
 *     tags: [FoodPartner]
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
 *         description: Food partner profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/FoodPartner'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get("/",
    authMiddleware.authFoodPartnerMiddleware,
    validate({ query: emptyQuerySchema, params: emptyParamsSchema, body: emptyBodySchema }),
    foodPartnerController.getFoodPartner
);

/**
 * @swagger
 * /api/v1/food-partner/follow:
 *   post:
 *     summary: Follow or unfollow a food partner
 *     tags: [FoodPartner]
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
 *               foodpartner:
 *                 type: string
 *                 description: Food partner ID
 *     responses:
 *       200:
 *         description: Food partner followed/unfollowed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Follow'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Food partner not found
 */
router.post(
    "/follow",
    authMiddleware.authUserMiddleware,
    validate({ body: followFoodPartnerSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
    foodPartnerController.followFoodPartner
);
    
/**
 * @swagger
 * /api/v1/food-partner/edit:
 *   patch:
 *     summary: Edit food partner profile
 *     tags: [FoodPartner]
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
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/FoodPartner'
 *     responses:
 *       200:
 *         description: Food partner profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodPartner'
 *           encoding:
 *             profile:
 *               contentType: ["image/jpeg", "image/png", "video/mp4"]
 *               description: |
 *                 File upload for food partner profile image or video. Max size: 10MB. Only JPEG, PNG, and MP4 allowed. File signature is validated for security.
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Food partner not found
 */
router.patch("/edit",
    authMiddleware.authFoodPartnerMiddleware,
    upload.single("profile"),
    validateFileSignature,
    validate({ body: editFoodPartnerSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
    foodPartnerController.editFoodPartner
);

/**
 * @swagger
 * /api/v1/food-partner/sessions:
 *   get:
 *     summary: List active sessions for current food partner (per-device/session management)
 *     tags: [FoodPartner]
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
router.get('/sessions', authMiddleware.authFoodPartnerMiddleware, listSessions);

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
router.delete('/sessions/:sessionId', authMiddleware.authFoodPartnerMiddleware, revokeSession);

module.exports = router;