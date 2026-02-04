/**
 * @fileoverview Analytics Routes
 * @description Routes for analytics event tracking and reporting
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const validate = require('../middlewares/validate.middleware');
const analyticsValidation = require('../validation/analytics.validation');
const { isOptionalAuth, authFoodPartnerMiddleware } = require('../middlewares/auth.middleware');
const { analyticsLimiter } = require('../middlewares/rateLimiter.middleware');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Event tracking and analytics reporting
 */

/**
 * @swagger
 * /api/v1/analytics/health:
 *   get:
 *     summary: Health check for analytics service
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', analyticsController.getHealth);

/**
 * @swagger
 * /api/v1/analytics/track:
 *   post:
 *     summary: Track a single analytics event
 *     tags: [Analytics]
 *     description: |
 *       Track user interactions, page views, and system events.
 *       Supports both authenticated and anonymous events.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *             properties:
 *               eventType:
 *                 type: string
 *                 example: "food:item_viewed"
 *               sessionId:
 *                 type: string
 *                 example: "sess_abc123"
 *               data:
 *                 type: object
 *                 example: { "foodId": "507f1f77bcf86cd799439011", "partnerId": "507f1f77bcf86cd799439012" }
 *               metadata:
 *                 type: object
 *               funnel:
 *                 type: object
 *                 properties:
 *                   step:
 *                     type: string
 *                   source:
 *                     type: string
 *                   campaign:
 *                     type: string
 *               performance:
 *                 type: object
 *                 properties:
 *                   pageLoadTime:
 *                     type: number
 *                   apiResponseTime:
 *                     type: number
 *     responses:
 *       201:
 *         description: Event tracked successfully
 *       400:
 *         description: Invalid event data
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/track',
  analyticsLimiter,
  isOptionalAuth, // Allow both authenticated and anonymous
  validate(analyticsValidation.trackEventSchema),
  analyticsController.trackEvent
);

/**
 * @swagger
 * /api/v1/analytics/track/batch:
 *   post:
 *     summary: Track multiple events in batch
 *     tags: [Analytics]
 *     description: More efficient than tracking events individually. Maximum 100 events per batch.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - events
 *             properties:
 *               events:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - eventType
 *                   properties:
 *                     eventType:
 *                       type: string
 *                     data:
 *                       type: object
 *                     sessionId:
 *                       type: string
 *     responses:
 *       201:
 *         description: Batch events tracked successfully
 *       400:
 *         description: Invalid batch data
 */
router.post(
  '/track/batch',
  analyticsLimiter,
  isOptionalAuth,
  validate(analyticsValidation.trackEventsBatchSchema),
  analyticsController.trackEventsBatch
);

/**
 * @swagger
 * /api/v1/analytics/dashboard:
 *   get:
 *     summary: Get real-time dashboard metrics
 *     tags: [Analytics]
 *     description: Returns aggregated metrics for today (events, orders, revenue, active users)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eventsToday:
 *                   type: number
 *                 ordersToday:
 *                   type: number
 *                 revenueToday:
 *                   type: number
 *                 uniqueUsersToday:
 *                   type: number
 *                 popularSearches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       query:
 *                         type: string
 *                       count:
 *                         type: number
 */
router.get(
  '/dashboard',
  analyticsController.getDashboard
);

/**
 * @swagger
 * /api/v1/analytics/metrics:
 *   get:
 *     summary: Get aggregated metrics for a date range
 *     tags: [Analytics]
 *     description: Query analytics events with grouping and filtering
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: eventTypes
 *         schema:
 *           type: string
 *           description: Comma-separated event types
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, month]
 *           default: day
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Metrics fetched successfully
 */
router.get(
  '/metrics',
  validate(analyticsValidation.getMetricsSchema),
  analyticsController.getMetrics
);

/**
 * @swagger
 * /api/v1/analytics/journey/{sessionId}:
 *   get:
 *     summary: Get user journey for a session
 *     tags: [Analytics]
 *     description: Returns all events for a specific session in chronological order
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User journey fetched successfully
 */
router.get(
  '/journey/:sessionId',
  validate(analyticsValidation.getUserJourneySchema),
  analyticsController.getUserJourney
);

/**
 * @swagger
 * /api/v1/analytics/funnel:
 *   get:
 *     summary: Get funnel conversion analysis
 *     tags: [Analytics]
 *     description: Analyze conversion rates through a multi-step funnel
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: steps
 *         required: true
 *         schema:
 *           type: string
 *           description: Comma-separated funnel steps
 *           example: "search,view_food,add_to_cart,checkout,order_complete"
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Funnel analysis fetched successfully
 */
router.get(
  '/funnel',
  validate(analyticsValidation.getFunnelAnalysisSchema),
  analyticsController.getFunnelAnalysis
);

/**
 * @swagger
 * /api/v1/analytics/partner/{partnerId}:
 *   get:
 *     summary: Get partner performance analytics
 *     tags: [Analytics]
 *     description: Analytics for a specific food partner (views, orders, revenue)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Partner performance fetched successfully
 *       403:
 *         description: Not authorized to view this partner's analytics
 */
router.get(
  '/partner/:partnerId',
  authFoodPartnerMiddleware, // Partner must be authenticated
  validate(analyticsValidation.getPartnerPerformanceSchema),
  analyticsController.getPartnerPerformance
);

/**
 * @swagger
 * /api/v1/analytics/distribution:
 *   get:
 *     summary: Get event distribution by category
 *     tags: [Analytics]
 *     description: Shows breakdown of events by category (page_view, interaction, transaction, etc.)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Event distribution fetched successfully
 */
router.get(
  '/distribution',
  validate(analyticsValidation.getEventDistributionSchema),
  analyticsController.getEventDistribution
);

module.exports = router;
