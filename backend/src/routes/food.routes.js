const express = require('express');
const foodController = require("../controllers/food.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const router = express.Router();
const validate = require('../middlewares/validate.middleware');
const { upload, validateFileSignature } = require('../middlewares/fileUpload.middleware');
const { createFoodSchema, updateFoodSchema } = require('../validation/food.validation');
const { objectIdSchema, paginationQuerySchema, emptyQuerySchema, emptyParamsSchema, emptyBodySchema, foodIdParamsSchema } = require('../validation/common.validation');
const { foodIdBodySchema, commentOnFoodSchema, deleteCommentSchema } = require('../validation/food-action.validation');



/**
 * @swagger
 * /api/v1/food:
 *   post:
 *     summary: Create a new food item
 *     tags: [Food]
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
 *             $ref: '#/components/schemas/FoodCreate'
 *           encoding:
 *             mama:
 *               contentType: ["image/jpeg", "image/png", "video/mp4"]
 *               description: |
 *                 File upload for food image or video. Max size: 10MB. Only JPEG, PNG, and MP4 allowed. File signature is validated for security.
 *     responses:
 *       201:
 *         description: Food item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Food'
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
    foodController.createFood
)

/**
 * @swagger
 * /api/v1/food:
 *   get:
 *     summary: Get paginated list of food items
 *     tags: [Food]
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
 *     responses:
 *       200:
 *         description: List of food items
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
router.get(
    "/",
    authMiddleware.authUserMiddleware,
    validate({ query: paginationQuerySchema, body: emptyBodySchema, params: emptyParamsSchema }),
    foodController.getFoodItems
)
/**
 * @swagger
 * /api/v1/food/{id}:
 *   patch:
 *     summary: Edit a food item
 *     tags: [Food]
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
 *         description: The food item ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/FoodUpdate'
 *           encoding:
 *             mama:
 *               contentType: ["image/jpeg", "image/png", "video/mp4"]
 *               description: |
 *                 File upload for food image or video. Max size: 10MB. Only JPEG, PNG, and MP4 allowed. File signature is validated for security.
 *     responses:
 *       200:
 *         description: Food item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Food'
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
    foodController.editFood
);

/**
 * @swagger
 * /api/v1/food/followed:
 *   get:
 *     summary: Get food items from followed food partners
 *     tags: [Food]
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
 *     responses:
 *       200:
 *         description: List of followed food items
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
router.get(
    "/followed",
    authMiddleware.authUserMiddleware,
    validate({ query: paginationQuerySchema, body: emptyBodySchema, params: emptyParamsSchema }),
    foodController.getFollowedFoodItems
);

/**
 * @swagger
 * /api/v1/food/like:
 *   post:
 *     summary: Like or unlike a food item
 *     tags: [Food]
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
router.post(
    "/like",    
    authMiddleware.authUserMiddleware,
    validate({ body: foodIdBodySchema, query: emptyQuerySchema, params: emptyParamsSchema }),
    foodController.likeFood
);

/**
 * @swagger
 * /api/v1/food/save:
 *   post:
 *     summary: Save or unsave a food item
 *     tags: [Food]
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
router.post(
    "/save",
    authMiddleware.authUserMiddleware,
    validate({ body: foodIdBodySchema, query: emptyQuerySchema, params: emptyParamsSchema }),
    foodController.saveFood
);

/**
 * @swagger
 * /api/v1/food/save:
 *   get:
 *     summary: Get all saved food items for the user
 *     tags: [Food]
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
router.get(
    "/save",
    authMiddleware.authUserMiddleware,
    foodController.getSaveFood
);

/**
 * @swagger
 * /api/v1/food/comment:
 *   post:
 *     summary: Comment on a food item
 *     tags: [Food]
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
router.post(
    "/comment",
    authMiddleware.authUserMiddleware,
    validate({ body: commentOnFoodSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
    foodController.commentOnFood
);

/**
 * @swagger
 * /api/v1/food/comment:
 *   get:
 *     summary: Get comments for a food item (user)
 *     tags: [Food]
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
router.get(
    "/comment", 
    authMiddleware.authUserMiddleware,
    foodController.getCommentOnFood
);

/**
 * @swagger
 * /api/v1/food/comments:
 *   get:
 *     summary: Get comments for a food item (food partner)
 *     tags: [Food]
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
router.get(
    "/comments",
    authMiddleware.authFoodPartnerMiddleware,
    foodController.getCommentOnFood
);

/**
 * @swagger
 * /api/v1/food/delete-comment:
 *   post:
 *     summary: Delete a comment on a food item
 *     tags: [Food]
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
router.post(
    "/delete-comment",
    authMiddleware.authUserMiddleware,
    validate({ body: deleteCommentSchema, query: emptyQuerySchema, params: emptyParamsSchema }),
    foodController.deleteCommentOnFood
);

/**
 * @swagger
 * /api/v1/food/{foodId}:
 *   delete:
 *     summary: Delete a food item
 *     tags: [Food]
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
router.delete(
    "/:foodId",
    authMiddleware.authFoodPartnerMiddleware,
    validate({ params: foodIdParamsSchema }),
    foodController.deleteFood
);

/**
 * @swagger
 * /api/v1/food/share:
 *   post:
 *     summary: Increment share count for a food item
 *     tags: [Food]
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
router.post(
    "/share",
    authMiddleware.authUserMiddleware,
    validate({ body: foodIdBodySchema, query: emptyQuerySchema, params: emptyParamsSchema }),
    foodController.updateShareCount
)

module.exports = router
// End of file