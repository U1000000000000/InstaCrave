const express = require('express');
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const searchController = require("../controllers/search.controller");
const validate = require('../middlewares/validate.middleware');
const { emptyQuerySchema, emptyBodySchema, emptyParamsSchema } = require('../validation/common.validation');
const { searchQuerySchema } = require('../validation/search.validation');
const { cacheMiddleware, publicCacheKey } = require('../middlewares/cache.middleware');

/**
 * @swagger
 * /api/v1/search:
 *   get:
 *     summary: Search for food items and food partners
 *     tags: [Search]
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
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [food, partner, all]
 *         required: false
 *         description: Type of search (food, partner, or all)
 *     responses:
 *       200:
 *         description: Search results fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     foodItems:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Food'
 *                     foodPartners:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FoodPartner'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get("/", 
	authMiddleware.authUserMiddleware,
	validate({ query: searchQuerySchema, body: emptyBodySchema, params: emptyParamsSchema }),
	cacheMiddleware(
		180,
		(req) => {
			const query = req.query.query || '';
			const type = req.query.type || 'all';
			return `search:q=${query}:type=${type}`;
		},
		{
			shouldCache: (req, res, data) => {
				// Don't cache empty results
				return data && data.data && (
					(data.data.foodItems && data.data.foodItems.length > 0) ||
					(data.data.foodPartners && data.data.foodPartners.length > 0)
				);
			}
		}
	),
	searchController.search
);

/**
 * @swagger
 * /api/v1/search/explore:
 *   get:
 *     summary: Explore food items and food partners not followed by the user
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       This endpoint is not individually rate limited, but is subject to the global rate limit for authenticated routes.
 *     responses:
 *       200:
 *         description: Explore results fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     foodItems:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Food'
 *                     foodPartners:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FoodPartner'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get("/explore",
	authMiddleware.authUserMiddleware,
	validate({ query: emptyQuerySchema, body: emptyBodySchema, params: emptyParamsSchema }),
	cacheMiddleware(180, (req) => {
		// Defensive: Handle case where req.user might not exist
		if (!req.user || !req.user._id) {
			return 'user:anonymous:explore';
		}
		return `user:${req.user._id}:explore`;
	}),
	searchController.explore
);

module.exports = router;