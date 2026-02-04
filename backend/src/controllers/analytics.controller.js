/**
 * @fileoverview Analytics Controller
 * @description HTTP endpoints for analytics event tracking and reporting
 */

const analyticsService = require('../services/analytics.service');
const catchAsync = require('../utils/catchAsync');
const responseUtil = require('../utils/response');
const AppError = require('../utils/AppError');
const logger = require('../services/logger.service');

/**
 * Track a single analytics event
 * 
 * POST /api/v1/analytics/track
 * 
 * Body:
 * {
 *   eventType: "food:item_viewed",
 *   data: { foodId: "123", partnerId: "456" },
 *   sessionId: "sess_abc123",
 *   metadata: { ... }
 * }
 */
const trackEvent = catchAsync(async (req, res) => {
  const { eventType, data, metadata, funnel, performance, error: errorData } = req.body;

  // Extract user context from authenticated request
  const userId = req.user?.id || req.user?._id;
  const userType = req.user ? (req.foodPartner ? 'FoodPartner' : 'User') : null;
  const sessionId = req.cookies?.sessionId || req.body.sessionId;

  // Track the event
  const result = await analyticsService.trackEvent({
    eventType,
    userId,
    userType,
    sessionId,
    data,
    metadata,
    funnel,
    performance,
    error: errorData,
    request: req, // For auto-enrichment (IP, user-agent, etc.)
  });

  if (!result.success) {
    throw new AppError('Failed to track event', 500);
  }

  logger.debug('Analytics event tracked via API', {
    eventId: result.eventId,
    eventType,
    userId,
  });

  responseUtil.sendItemResponse(res, {
    data: { eventId: result.eventId },
    message: 'Event tracked successfully',
    statusCode: 201,
  });
});

/**
 * Track multiple events in batch
 * 
 * POST /api/v1/analytics/track/batch
 * 
 * Body:
 * {
 *   events: [
 *     { eventType: "food:item_viewed", data: {...} },
 *     { eventType: "food:item_liked", data: {...} }
 *   ]
 * }
 */
const trackEventsBatch = catchAsync(async (req, res) => {
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    throw new AppError('Events array is required', 400);
  }

  if (events.length > 100) {
    throw new AppError('Maximum 100 events per batch', 400);
  }

  // Add user context to each event
  const userId = req.user?.id || req.user?._id;
  const userType = req.user ? (req.foodPartner ? 'FoodPartner' : 'User') : null;
  const sessionId = req.cookies?.sessionId;

  const enrichedEvents = events.map((event) => ({
    ...event,
    userId: event.userId || userId,
    userType: event.userType || userType,
    sessionId: event.sessionId || sessionId,
    request: req,
  }));

  const result = await analyticsService.trackEventsBatch(enrichedEvents);

  if (!result.success) {
    throw new AppError('Failed to track batch events', 500);
  }

  logger.info('Batch analytics events tracked', {
    count: result.count,
    userId,
  });

  responseUtil.sendItemResponse(res, {
    data: { tracked: result.count },
    message: `${result.count} events tracked successfully`,
    statusCode: 201,
  });
});

/**
 * Get real-time dashboard metrics
 * 
 * GET /api/v1/analytics/dashboard
 * 
 * Returns:
 * - Events today
 * - Orders today
 * - Revenue today
 * - Unique users today
 * - Popular searches
 */
const getDashboard = catchAsync(async (req, res) => {
  const result = await analyticsService.getRealTimeMetrics();

  if (!result.success) {
    throw new AppError('Failed to fetch dashboard metrics', 500);
  }

  responseUtil.sendItemResponse(res, {
    data: result.data,
    message: 'Dashboard metrics fetched successfully',
  });
});

/**
 * Get aggregated metrics
 * 
 * GET /api/v1/analytics/metrics
 * 
 * Query params:
 * - startDate (required): ISO date string
 * - endDate (required): ISO date string
 * - eventTypes: Comma-separated event types
 * - groupBy: hour | day | month
 * - userId: Filter by user ID
 * - sessionId: Filter by session ID
 */
const getMetrics = catchAsync(async (req, res) => {
  const { startDate, endDate, eventTypes, groupBy, userId, sessionId } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('startDate and endDate are required', 400);
  }

  const query = {
    startDate,
    endDate,
    eventTypes: eventTypes ? eventTypes.split(',') : undefined,
    groupBy: groupBy || 'day',
    userId,
    sessionId,
  };

  const result = await analyticsService.getMetrics(query);

  if (!result.success) {
    throw new AppError('Failed to fetch metrics', 500);
  }

  responseUtil.sendListResponse(res, {
    data: result.data,
    message: 'Metrics fetched successfully',
    total: result.data.length,
  });
});

/**
 * Get user journey (session-based)
 * 
 * GET /api/v1/analytics/journey/:sessionId
 */
const getUserJourney = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new AppError('Session ID is required', 400);
  }

  const result = await analyticsService.getUserJourney(sessionId);

  if (!result.success) {
    throw new AppError('Failed to fetch user journey', 500);
  }

  responseUtil.sendItemResponse(res, {
    data: result.data,
    message: 'User journey fetched successfully',
  });
});

/**
 * Get funnel conversion analysis
 * 
 * GET /api/v1/analytics/funnel
 * 
 * Query params:
 * - steps (required): Comma-separated funnel steps
 * - startDate (required): ISO date string
 * - endDate (required): ISO date string
 * 
 * Example:
 * /api/v1/analytics/funnel?steps=search,view_food,add_to_cart,checkout,order_complete&startDate=2026-01-01&endDate=2026-01-31
 */
const getFunnelAnalysis = catchAsync(async (req, res) => {
  const { steps, startDate, endDate } = req.query;

  if (!steps || !startDate || !endDate) {
    throw new AppError('steps, startDate, and endDate are required', 400);
  }

  const funnelSteps = steps.split(',');

  const result = await analyticsService.getFunnelAnalysis(funnelSteps, startDate, endDate);

  if (!result.success) {
    throw new AppError('Failed to fetch funnel analysis', 500);
  }

  responseUtil.sendItemResponse(res, {
    data: result.data,
    message: 'Funnel analysis fetched successfully',
  });
});

/**
 * Get partner performance analytics
 * 
 * GET /api/v1/analytics/partner/:partnerId
 * 
 * Query params:
 * - startDate (required): ISO date string
 * - endDate (required): ISO date string
 */
const getPartnerPerformance = catchAsync(async (req, res) => {
  const { partnerId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('startDate and endDate are required', 400);
  }

  // Check authorization: only the partner can view their performance
  const isOwnPartner = req.foodPartner?.id === partnerId || req.foodPartner?._id?.toString() === partnerId;

  if (!isOwnPartner) {
    throw new AppError('You are not authorized to view this partner\'s performance', 403);
  }

  const result = await analyticsService.getPartnerPerformance(partnerId, startDate, endDate);

  if (!result.success) {
    throw new AppError('Failed to fetch partner performance', 500);
  }

  responseUtil.sendListResponse(res, {
    data: result.data,
    message: 'Partner performance fetched successfully',
    total: result.data.length,
  });
});

/**
 * Get event distribution by category
 * 
 * GET /api/v1/analytics/distribution
 * 
 * Query params:
 * - startDate (required): ISO date string
 * - endDate (required): ISO date string
 */
const getEventDistribution = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('startDate and endDate are required', 400);
  }

  const result = await analyticsService.getEventDistribution(startDate, endDate);

  if (!result.success) {
    throw new AppError('Failed to fetch event distribution', 500);
  }

  responseUtil.sendListResponse(res, {
    data: result.data,
    message: 'Event distribution fetched successfully',
    total: result.data.length,
  });
});

/**
 * Health check endpoint
 * 
 * GET /api/v1/analytics/health
 */
const getHealth = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Analytics service is healthy',
    timestamp: new Date(),
  });
});

module.exports = {
  trackEvent,
  trackEventsBatch,
  getDashboard,
  getMetrics,
  getUserJourney,
  getFunnelAnalysis,
  getPartnerPerformance,
  getEventDistribution,
  getHealth,
};
