const express = require('express');
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const searchController = require("../controllers/search.controller");

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
	searchController.explore
);

module.exports = router;