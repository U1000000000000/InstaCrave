// backend/src/routes/food.v2.routes.js
const express = require('express');
const foodController = require('../controllers/food.v2.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const queryValidation = require('../middlewares/queryValidation.middleware');
const { upload, validateFileSignature } = require('../middlewares/fileUpload.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/v2/food:
 *   post:
 *     summary: Create a new food item (v2)
 *     tags: [FoodV2]
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
 *             $ref: '#/components/schemas/Food'
 *     responses:
 *       201:
 *         description: Food item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Food'
 *           encoding:
 *             mama:
 *               contentType: ["image/jpeg", "image/png", "video/mp4"]
 *               description: |
 *                 File upload for food image or video. Max size: 10MB. Only JPEG, PNG, and MP4 allowed. File signature is validated for security.
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  authMiddleware.authFoodPartnerMiddleware,
  upload.single('mama'),
  validateFileSignature,
  foodController.createFood
);

/**
 * @swagger
 * /api/v2/food:
 *   get:
 *     summary: Get paginated, filtered, and sorted list of food items (v2)
 *     tags: [FoodV2]
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
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort order (e.g., price,-name)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: price
 *         schema:
 *           type: number
 *         description: Filter by price
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by name
 *       - in: query
 *         name: foodPartner
 *         schema:
 *           type: string
 *         description: Filter by food partner
 *       - in: query
 *         name: isOrderable
 *         schema:
 *           type: boolean
 *         description: Filter by orderable status
 *     responses:
 *       200:
 *         description: List of food items with advanced pagination/filter/sort
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Food'
 *                 pagination:
 *                   type: object
 *                 filters:
 *                   type: object
 *                 sort:
 *                   type: object
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/',
  authMiddleware.authUserMiddleware,
  queryValidation,
  foodController.getFoodItems
);

/**
 * @swagger
 * /api/v2/food/{id}:
 *   patch:
 *     summary: Edit a food item (v2)
 *     tags: [FoodV2]
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
 *         description: Food item ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/Food'
 *     responses:
 *       200:
 *         description: Food item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Food'
 *           encoding:
 *             mama:
 *               contentType: ["image/jpeg", "image/png", "video/mp4"]
 *               description: |
 *                 File upload for food image or video. Max size: 10MB. Only JPEG, PNG, and MP4 allowed. File signature is validated for security.
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Food not found
 */
router.patch(
  '/:id',
  authMiddleware.authFoodPartnerMiddleware,
  upload.single('mama'),
  validateFileSignature,
  foodController.editFood
);

/**
 * @swagger
 * /api/v2/food/followed:
 *   get:
 *     summary: Get food items from followed food partners (v2, advanced pagination/filter/sort)
 *     tags: [FoodV2]
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
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort order (e.g., price,-name)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: price
 *         schema:
 *           type: number
 *         description: Filter by price
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by name
 *       - in: query
 *         name: foodPartner
 *         schema:
 *           type: string
 *         description: Filter by food partner
 *       - in: query
 *         name: isOrderable
 *         schema:
 *           type: boolean
 *         description: Filter by orderable status
 *     responses:
 *       200:
 *         description: List of followed food items with advanced pagination/filter/sort
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Food'
 *                 pagination:
 *                   type: object
 *                 filters:
 *                   type: object
 *                 sort:
 *                   type: object
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/followed',
  authMiddleware.authUserMiddleware,
  queryValidation,
  foodController.getFollowedFoodItems
);


/**
 * @swagger
 * /api/v2/food/like:
 *   post:
 *     summary: Like or unlike a food item (v2)
 *     tags: [FoodV2]
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
 *               foodId:
 *                 type: string
 *                 description: Food item ID
 *     responses:
 *       200:
 *         description: Food liked/unliked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Like'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/like',
  authMiddleware.authUserMiddleware,
  foodController.likeFood
);

/**
 * @swagger
 * /api/v2/food/save:
 *   post:
 *     summary: Save or unsave a food item (v2)
 *     tags: [FoodV2]
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
 *               foodId:
 *                 type: string
 *                 description: Food item ID
 *     responses:
 *       200:
 *         description: Food saved/unsaved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Save'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/save',
  authMiddleware.authUserMiddleware,
  foodController.saveFood
);

/**
 * @swagger
 * /api/v2/food/save:
 *   get:
 *     summary: Get all saved food items for the user (v2)
 *     tags: [FoodV2]
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
 *         description: List of saved food items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Food'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/save',
  authMiddleware.authUserMiddleware,
  foodController.getSaveFood
);

/**
 * @swagger
 * /api/v2/food/comment:
 *   post:
 *     summary: Comment on a food item (v2)
 *     tags: [FoodV2]
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
 *               foodId:
 *                 type: string
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       401:
 *         description: Unauthorized
 */
router.post('/comment',
  authMiddleware.authUserMiddleware,
  foodController.commentOnFood
);

/**
 * @swagger
 * /api/v2/food/comment:
 *   get:
 *     summary: Get comments for a food item (user, v2)
 *     tags: [FoodV2]
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
 *         name: foodId
 *         schema:
 *           type: string
 *         required: true
 *         description: Food item ID
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/comment',
  authMiddleware.authUserMiddleware,
  foodController.getCommentOnFood
);

/**
 * @swagger
 * /api/v2/food/comments:
 *   get:
 *     summary: Get comments for a food item (food partner, v2)
 *     tags: [FoodV2]
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
 *         name: foodId
 *         schema:
 *           type: string
 *         required: true
 *         description: Food item ID
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/comments',
  authMiddleware.authFoodPartnerMiddleware,
  foodController.getCommentOnFood
);

/**
 * @swagger
 * /api/v2/food/delete-comment:
 *   post:
 *     summary: Delete a comment on a food item (v2)
 *     tags: [FoodV2]
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
 *               commentId:
 *                 type: string
 *                 description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/delete-comment',
  authMiddleware.authUserMiddleware,
  foodController.deleteCommentOnFood
);

/**
 * @swagger
 * /api/v2/food/{foodId}:
 *   delete:
 *     summary: Delete a food item (v2)
 *     tags: [FoodV2]
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
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *         description: Food item ID
 *     responses:
 *       200:
 *         description: Food item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Food not found
 */
router.delete('/:foodId',
  authMiddleware.authFoodPartnerMiddleware,
  foodController.deleteFood
);

/**
 * @swagger
 * /api/v2/food/share:
 *   post:
 *     summary: Increment share count for a food item (v2)
 *     tags: [FoodV2]
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
 *               foodId:
 *                 type: string
 *                 description: Food item ID
 *     responses:
 *       200:
 *         description: Share count updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/share',
  authMiddleware.authUserMiddleware,
  foodController.updateShareCount
);

module.exports = router;
