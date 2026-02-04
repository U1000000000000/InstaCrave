const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const validate = require('../middlewares/validate.middleware');
const {
  addItemSchema,
  updateItemSchema,
  foodIdParamsSchema,
  emptyQuerySchema,
  emptyParamsSchema,
} = require('../validation/cart.validation');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * Cart Routes
 * 
 * Features:
 * - Supports authenticated and anonymous users (session-based)
 * - Cart merging on login
 * - Redis caching
 * 
 * Authentication: Optional for most endpoints
 */

const { isOptionalAuth } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         food:
 *           type: string
 *           description: Food item ObjectId
 *         foodName:
 *           type: string
 *           description: Name of the food item
 *         quantity:
 *           type: number
 *           minimum: 1
 *           maximum: 99
 *         price:
 *           type: number
 *           minimum: 0
 *         subtotal:
 *           type: number
 *           minimum: 0
 *     
 *     Cart:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *           nullable: true
 *           description: User ObjectId (null for anonymous carts)
 *         sessionId:
 *           type: string
 *           nullable: true
 *           description: Session ID for anonymous users
 *         foodPartner:
 *           type: string
 *           description: Food partner ObjectId
 *         foodPartnerName:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         itemCount:
 *           type: number
 *           minimum: 0
 *         totalPrice:
 *           type: number
 *           minimum: 0
 *         status:
 *           type: string
 *           enum: [active, merged, converted, abandoned, expired]
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         lastActivityAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CartSummary:
 *       type: object
 *       properties:
 *         itemCount:
 *           type: number
 *         totalPrice:
 *           type: number
 *         foodPartnerName:
 *           type: string
 *           nullable: true
 *         hasCart:
 *           type: boolean
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     
 *     AddCartItem:
 *       type: object
 *       required:
 *         - foodId
 *         - quantity
 *       properties:
 *         foodId:
 *           type: string
 *           description: Food item ObjectId
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         quantity:
 *           type: number
 *           minimum: 1
 *           maximum: 99
 *     
 *     UpdateCartItem:
 *       type: object
 *       required:
 *         - quantity
 *       properties:
 *         quantity:
 *           type: number
 *           minimum: 0
 *           maximum: 99
 *           description: Set to 0 to remove item
 */

/**
 * @swagger
 * /api/v1/cart:
 *   get:
 *     summary: Get current cart
 *     tags: [Cart]
 *     description: |
 *       Retrieves the active cart for the current user or session.
 *       - Authenticated users: Returns cart associated with user ID
 *       - Anonymous users: Returns cart associated with session cookie
 *       - If no cart exists, returns empty cart structure
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 */
router.get(
  '/',
  isOptionalAuth,
  validate(emptyQuerySchema, emptyParamsSchema),
  cartController.getCart
);

/**
 * @swagger
 * /api/v1/cart/summary:
 *   get:
 *     summary: Get cart summary
 *     tags: [Cart]
 *     description: |
 *       Lightweight endpoint for UI badges and quick cart info.
 *       Returns only essential information (item count, total price).
 *       Faster than full cart retrieval.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart summary retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/CartSummary'
 */
router.get(
  '/summary',
  isOptionalAuth,
  validate(emptyQuerySchema, emptyParamsSchema),
  cartController.getCartSummary
);

/**
 * @swagger
 * /api/v1/cart/items:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     description: |
 *       Adds a food item to the cart. If the item already exists, increases quantity.
 *       
 *       **Business Rules:**
 *       - All items in a cart must be from the same food partner
 *       - If adding from a different partner, the request will fail
 *       - Maximum quantity per item: 99
 *       - Maximum cart total: $10,000
 *       
 *       **Anonymous Users:**
 *       - A session cookie (cart_session) is automatically created
 *       - Cart persists for 7 days
 *       - Cart is merged when user logs in
 *       
 *       **Authenticated Users:**
 *       - Cart persists for 30 days
 *       - Associated with user account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddCartItem'
 *     responses:
 *       200:
 *         description: Item added to cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Validation error or business rule violation
 *       404:
 *         description: Food item not found
 */
router.post(
  '/items',
  isOptionalAuth,
  validate(addItemSchema, emptyParamsSchema, emptyQuerySchema),
  cartController.addItemToCart
);

/**
 * @swagger
 * /api/v1/cart/items/{foodId}:
 *   patch:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     description: |
 *       Updates the quantity of a specific item in the cart.
 *       Set quantity to 0 to remove the item.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Food item ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCartItem'
 *     responses:
 *       200:
 *         description: Cart item updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/Cart'
 *                     - type: 'null'
 *       404:
 *         description: Cart or item not found
 */
router.patch(
  '/items/:foodId',
  isOptionalAuth,
  validate(updateItemSchema, foodIdParamsSchema, emptyQuerySchema),
  cartController.updateCartItem
);

/**
 * @swagger
 * /api/v1/cart/items/{foodId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     description: Removes a specific item from the cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: foodId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Food item ObjectId
 *     responses:
 *       200:
 *         description: Item removed from cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/Cart'
 *                     - type: 'null'
 *       404:
 *         description: Cart or item not found
 */
router.delete(
  '/items/:foodId',
  isOptionalAuth,
  validate(emptyQuerySchema, foodIdParamsSchema),
  cartController.removeCartItem
);

/**
 * @swagger
 * /api/v1/cart:
 *   delete:
 *     summary: Clear cart
 *     tags: [Cart]
 *     description: Removes all items from the cart and deletes the cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: 'null'
 *       404:
 *         description: No active cart found
 */
router.delete(
  '/',
  isOptionalAuth,
  validate(emptyQuerySchema, emptyParamsSchema),
  cartController.clearCart
);

/**
 * @swagger
 * /api/v1/cart/validate:
 *   post:
 *     summary: Validate cart prices
 *     tags: [Cart]
 *     description: |
 *       Validates that all cart item prices match current database prices.
 *       Updates prices if they have changed.
 *       Should be called before checkout to ensure price accuracy.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart prices validated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     cart:
 *                       $ref: '#/components/schemas/Cart'
 *                     priceChanged:
 *                       type: boolean
 *                     priceChanges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           foodId:
 *                             type: string
 *                           foodName:
 *                             type: string
 *                           oldPrice:
 *                             type: number
 *                           newPrice:
 *                             type: number
 *       404:
 *         description: Cart not found
 */
router.post(
  '/validate',
  isOptionalAuth,
  validate(emptyQuerySchema, emptyParamsSchema),
  cartController.validateCartPrices
);

/**
 * @swagger
 * /api/v1/cart/merge:
 *   post:
 *     summary: Merge session cart to user cart
 *     tags: [Cart]
 *     description: |
 *       Merges an anonymous session cart into the authenticated user's cart.
 *       Called automatically by the auth system on login.
 *       
 *       **Merge Rules:**
 *       - If no user cart exists, session cart becomes user cart
 *       - If both exist and same partner, items are merged
 *       - If different partners, user cart is kept, session cart abandoned
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart merged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/Cart'
 *                     - type: 'null'
 *       401:
 *         description: Authentication required
 */
router.post(
  '/merge',
  authMiddleware.authUserMiddleware, // Required auth for merge
  validate(emptyQuerySchema, emptyParamsSchema),
  cartController.mergeSessionCart
);

module.exports = router;
