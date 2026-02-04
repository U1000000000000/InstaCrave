const express = require('express');
const { createOrder, getUserOrders, getPartnerOrders, updateOrderStatus } = require('../controllers/order.controller');
const validate = require('../middlewares/validate.middleware');
const { createOrderSchema, updateOrderStatusSchema } = require('../validation/order.validation');
const { emptyQuerySchema, emptyParamsSchema, emptyBodySchema } = require('../validation/common.validation');
const { objectIdSchema } = require('../validation/common.validation');
const authMiddleware = require('../middlewares/auth.middleware');
const { cacheMiddleware, invalidateCache, userCacheKey, partnerCacheKey } = require('../middlewares/cache.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Order]
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
 *             $ref: '#/components/schemas/OrderCreate'
 *     responses:
 *       201:
 *         description: Order placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error or food not orderable
 *       401:
 *         description: Unauthorized
 */
router.post('/',
	authMiddleware.authUserMiddleware,
	validate({ body: createOrderSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
	invalidateCache(
		(req) => `user:${req.user._id}:orders:*`,
		(req) => `partner:*:orders:*`
	),
	createOrder
);

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get all orders for the current user
 *     tags: [Order]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       This endpoint is not individually rate limited, but is subject to the global rate limit for authenticated routes.
 *     responses:
 *       200:
 *         description: List of user orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/', 
	authMiddleware.authUserMiddleware, 
	validate({ query: emptyQuerySchema, params: emptyParamsSchema, body: emptyBodySchema }),
    cacheMiddleware(60, (req) => {
        // Defensive: Handle case where req.user might not exist
        if (!req.user || !req.user._id) {
            return 'user:anonymous:orders:list';
        }
        return `user:${req.user._id}:orders:list`;
    }),
    getUserOrders
);

/**
 * @swagger
 * /api/v1/orders/partner:
 *   get:
 *     summary: Get all orders for the current food partner
 *     tags: [Order]
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
 *         description: List of partner orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/partner', 
	authMiddleware.authFoodPartnerMiddleware,
	validate({ query: emptyQuerySchema, params: emptyParamsSchema, body: emptyBodySchema }),
    cacheMiddleware(60, (req) => {
        // Defensive: Handle case where req.user might not exist
        if (!req.user || !req.user._id) {
            return 'partner:anonymous:orders:list';
        }
        return `partner:${req.user._id}:orders:list`;
    }),
	getPartnerOrders
);

/**
 * @swagger
 * /api/v1/orders/{id}/status:
 *   patch:
 *     summary: Update order status (food partner only)
 *     tags: [Order]
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
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, preparing, out-for-delivery, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error or cannot change status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
router.patch(
	'/:id/status',
	authMiddleware.authFoodPartnerMiddleware,
	validate({ params: objectIdSchema, body: updateOrderStatusSchema, query: emptyQuerySchema }),
	invalidateCache(
		(req) => `user:*:orders:*`,
		(req) => `partner:${req.user._id}:orders:*`
	),
	updateOrderStatus
);

module.exports = router;