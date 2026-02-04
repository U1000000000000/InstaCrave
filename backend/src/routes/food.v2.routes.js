// backend/src/routes/food.v2.routes.js
const express = require('express');
const foodController = require('../controllers/food.v2.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const queryValidation = require('../middlewares/queryValidation.middleware');
const { upload, validateFileSignature } = require('../middlewares/fileUpload.middleware');
const validate = require('../middlewares/validate.middleware');
const { createFoodSchema, updateFoodSchema } = require('../validation/food.validation');
const { objectIdSchema, paginationQuerySchema, emptyQuerySchema, emptyParamsSchema, emptyBodySchema, foodIdParamsSchema } = require('../validation/common.validation');
const { foodIdBodySchema, commentOnFoodSchema, deleteCommentSchema } = require('../validation/food-action.validation');

const { cacheMiddleware, invalidateCache } = require('../middlewares/cache.middleware');
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
  validate({ body: createFoodSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
  invalidateCache(
    '*:food:list:*',
    (req) => `partner:${req.user._id}:*`
  ),
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
 *         description: List of food items with pagination/filter/sort
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
  validate({ body: emptyBodySchema, params: emptyParamsSchema }),
  cacheMiddleware(300, req => {
    const userId = req.user ? req.user._id : 'anon';
    return `food:v2:list:user=${userId}:page=${req.query.page || 1}:limit=${req.query.limit || 10}:sort=${req.query.sort || ''}:category=${req.query.category || ''}:price=${req.query.price || ''}:name=${req.query.name || ''}:foodPartner=${req.query.foodPartner || ''}:isOrderable=${req.query.isOrderable || ''}`;
  }),
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
  validate({ params: objectIdSchema, body: updateFoodSchema, query: emptyQuerySchema }),
  invalidateCache(
    (req) => `food:${req.params.id}:*`,
    '*:food:list:*',
    (req) => `partner:${req.user._id}:*`
  ),
  foodController.editFood
);

/**
 * @swagger
 * /api/v2/food/followed:
 *   get:
 *     summary: Get food items from followed food partners (with pagination/filter/sort)
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
 *         description: List of followed food items with pagination/filter/sort
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
  validate({ body: emptyBodySchema, params: emptyParamsSchema }),
  cacheMiddleware(300, req => {
    // Defensive: Handle case where req.user might not exist
    if (!req.user || !req.user._id) {
      return `user:anonymous:food:v2:followed:page=${req.query.page || 1}:limit=${req.query.limit || 10}:sort=${req.query.sort || ''}:category=${req.query.category || ''}:price=${req.query.price || ''}:name=${req.query.name || ''}:foodPartner=${req.query.foodPartner || ''}:isOrderable=${req.query.isOrderable || ''}`;
    }
    const userId = req.user._id;
    return `user:${userId}:food:v2:followed:page=${req.query.page || 1}:limit=${req.query.limit || 10}:sort=${req.query.sort || ''}:category=${req.query.category || ''}:price=${req.query.price || ''}:name=${req.query.name || ''}:foodPartner=${req.query.foodPartner || ''}:isOrderable=${req.query.isOrderable || ''}`;
  }),
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
  validate({ body: foodIdBodySchema, query: emptyQuerySchema, params: emptyParamsSchema }),
  invalidateCache(
    // Clear specific food item cache
    (req) => `food:${req.body.foodId}:*`,
    // Clear acting user's caches
    (req) => `user:${req.user._id}:*`,
    // Clear all food list caches (all users may see updated like count)
    '*:food:list:*',
    '*:food:v2:list:*',
    // Clear all followed food lists (like count may appear there)
    'user:*:food:followed:*',
    'user:*:food:v2:followed:*'
  ),
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
  validate({ body: foodIdBodySchema, query: emptyQuerySchema, params: emptyParamsSchema }),
  invalidateCache(
    // Clear specific food item cache (save count may be displayed)
    (req) => `food:${req.body.foodId}:*`,
    // Clear acting user's caches
    (req) => `user:${req.user._id}:*`,
    // Clear all food list caches (save count may appear there)
    '*:food:list:*',
    '*:food:v2:list:*'
  ),
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
  validate({ query: paginationQuerySchema, params: emptyParamsSchema, body: emptyBodySchema }),
  cacheMiddleware(300, req => {
    // Defensive: Handle case where req.user might not exist
    if (!req.user || !req.user._id) {
      return 'user:anonymous:food:v2:saved';
    }
    return `user:${req.user._id}:food:v2:saved:limit=${req.query.limit}:skip=${req.query.skip}`;
  }),
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
  validate({ body: commentOnFoodSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
  invalidateCache(
    // Clear specific food item cache (includes comments)
    (req) => `food:${req.body.foodId}:*`,
    // Clear acting user's comment caches
    (req) => `user:${req.user._id}:comments`,
    // Clear all food list caches (comment count may appear there)
    '*:food:list:*',
    '*:food:v2:list:*',
    // Clear all followed food lists (comment count may appear there)
    'user:*:food:followed:*',
    'user:*:food:v2:followed:*'
  ),
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
  validate({ query: foodIdParamsSchema, body: emptyBodySchema, params: emptyParamsSchema }),
  cacheMiddleware(180, req => `food:${req.query.foodId}:v2:comments`),
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
  validate({ query: foodIdParamsSchema, body: emptyBodySchema, params: emptyParamsSchema }),
  cacheMiddleware(180, req => `food:${req.query.foodId}:v2:comments`),
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
  validate({ body: deleteCommentSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
  invalidateCache(
    // Clear all food comments (we don't know which food without DB lookup)
    'food:*:comments',
    'food:*:v2:comments',
    // Clear acting user's comment caches
    (req) => `user:${req.user._id}:comments`,
    // Clear all food list caches (comment count may appear there)
    '*:food:list:*',
    '*:food:v2:list:*',
    // Clear all followed food lists (comment count may appear there)
    'user:*:food:followed:*',
    'user:*:food:v2:followed:*'
  ),
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
  validate({ params: foodIdParamsSchema }),
  invalidateCache(
    (req) => `food:${req.params.foodId}:*`,
    '*:food:list:*',
    (req) => `partner:${req.user._id}:*`
  ),
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
  validate({ body: foodIdBodySchema, query: emptyQuerySchema, params: emptyParamsSchema }),
  invalidateCache(
    // Clear specific food item cache (share count updated)
    (req) => `food:${req.body.foodId}:*`,
    // Clear all food list caches (share count may appear there)
    '*:food:list:*',
    '*:food:v2:list:*',
    // Clear all followed food lists (share count may appear there)
    'user:*:food:followed:*',
    'user:*:food:v2:followed:*'
  ),
  foodController.updateShareCount
);

module.exports = router;
