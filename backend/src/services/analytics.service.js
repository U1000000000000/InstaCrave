/**
 * @fileoverview Analytics Service
 * @description Core business logic for event tracking, aggregation, and reporting
 *              Handles event ingestion, enrichment, storage, and querying
 */

const { uuidv4 } = require('../utils/uuid');
const AnalyticsEvent = require('../models/analytics.model');
const logger = require('./logger.service');
const { cache } = require('./redis.service');
const uaParser = require('ua-parser-js');
const {
  isValidEventType,
  getCategoryForEvent,
  getFunnelStepForEvent,
  EVENT_CATEGORIES,
} = require('../constants/analytics.constants');

class AnalyticsService {
  /**
   * Track an analytics event
   * 
   * @param {Object} eventData - Event data
   * @param {string} eventData.eventType - Type of event (from constants)
   * @param {string} [eventData.userId] - User ID (optional for anonymous)
   * @param {string} [eventData.userType] - User type (User, FoodPartner)
   * @param {string} [eventData.sessionId] - Session ID
   * @param {Object} [eventData.data] - Event-specific data
   * @param {Object} [eventData.metadata] - Additional metadata
   * @param {Object} [eventData.request] - Express request object (for auto-enrichment)
   * @returns {Promise<Object>} Created event
   */
  async trackEvent(eventData) {
    try {
      const startTime = Date.now();

      // 1. Validate event type
      if (!isValidEventType(eventData.eventType)) {
        logger.warn('Invalid event type', { eventType: eventData.eventType });
        return { success: false, error: 'Invalid event type' };
      }

      // 2. Generate unique event ID
      const eventId = `evt_${uuidv4()}`;

      // 3. Build event object
      const event = {
        eventId,
        eventType: eventData.eventType,
        eventCategory: eventData.eventCategory || getCategoryForEvent(eventData.eventType),
        timestamp: new Date(),
        
        // User context
        userId: eventData.userId || null,
        userType: eventData.userType || null,
        sessionId: eventData.sessionId || null,
        isAnonymous: !eventData.userId,
        
        // Event data
        data: eventData.data || {},
        metadata: eventData.metadata || {},
      };

      // 4. Enrich with request context (if request object provided)
      if (eventData.request) {
        this.enrichWithRequest(event, eventData.request);
      }

      // 5. Add funnel tracking
      const funnelStep = getFunnelStepForEvent(eventData.eventType);
      if (funnelStep || eventData.funnel) {
        event.funnel = {
          step: funnelStep || eventData.funnel?.step,
          previousStep: eventData.funnel?.previousStep,
          source: eventData.funnel?.source,
          campaign: eventData.funnel?.campaign,
          medium: eventData.funnel?.medium,
          referrer: eventData.funnel?.referrer,
        };
      }

      // 6. Add performance metrics (if provided)
      if (eventData.performance) {
        event.performance = eventData.performance;
      }

      // 7. Add error context (if error event)
      if (eventData.error) {
        event.error = {
          message: eventData.error.message,
          stack: eventData.error.stack?.substring(0, 2000), // Limit stack trace
          code: eventData.error.code,
          statusCode: eventData.error.statusCode,
        };
      }

      // 8. Store event in database (async, non-blocking)
      const savedEvent = await AnalyticsEvent.create(event);

      // 9. Update real-time counters (Redis)
      await this.updateRealTimeMetrics(event);

      // 10. Log performance
      const duration = Date.now() - startTime;
      if (duration > 100) {
        logger.warn('Slow analytics event tracking', {
          eventType: event.eventType,
          duration,
        });
      }

      logger.debug('Event tracked successfully', {
        eventId,
        eventType: event.eventType,
        userId: event.userId,
        duration,
      });

      return { success: true, eventId, event: savedEvent };
    } catch (error) {
      logger.error('Failed to track analytics event', {
        error: error.message,
        stack: error.stack,
        eventType: eventData.eventType,
      });
      
      // Don't throw - analytics failures shouldn't break the app
      return { success: false, error: error.message };
    }
  }

  /**
   * Track multiple events in batch
   * More efficient than tracking individually
   */
  async trackEventsBatch(events) {
    try {
      const enrichedEvents = events.map((eventData) => {
        const eventId = `evt_${uuidv4()}`;
        const event = {
          eventId,
          eventType: eventData.eventType,
          eventCategory: eventData.eventCategory || getCategoryForEvent(eventData.eventType),
          timestamp: new Date(),
          userId: eventData.userId || null,
          userType: eventData.userType || null,
          sessionId: eventData.sessionId || null,
          isAnonymous: !eventData.userId,
          data: eventData.data || {},
          metadata: eventData.metadata || {},
        };

        if (eventData.request) {
          this.enrichWithRequest(event, eventData.request);
        }

        return event;
      });

      // Bulk insert (more efficient)
      const savedEvents = await AnalyticsEvent.bulkInsertEvents(enrichedEvents);

      logger.info('Batch events tracked', {
        count: enrichedEvents.length,
        success: savedEvents.length,
      });

      return { success: true, count: savedEvents.length };
    } catch (error) {
      logger.error('Failed to track batch events', {
        error: error.message,
        count: events.length,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Enrich event with request context
   * Extracts IP, user-agent, device info, etc.
   */
  enrichWithRequest(event, req) {
    // Device & browser info from user-agent
    if (req.get && req.get('user-agent')) {
      const ua = uaParser(req.get('user-agent'));
      
      event.device = {
        type: ua.device.type || 'desktop',
        os: ua.os.name && ua.os.version ? `${ua.os.name} ${ua.os.version}` : 'unknown',
        browser: ua.browser.name && ua.browser.version ? `${ua.browser.name} ${ua.browser.version}` : 'unknown',
        userAgent: req.get('user-agent').substring(0, 500),
      };
    }

    // Location info from IP
    if (req.ip) {
      event.location = {
        ip: req.ip,
        // In production, use GeoIP service to get country/city
        // For now, store IP only
      };
    }

    // Referrer (for attribution)
    if (req.get && req.get('referer')) {
      if (!event.funnel) event.funnel = {};
      event.funnel.referrer = req.get('referer').substring(0, 500);
    }

    return event;
  }

  /**
   * Update real-time metrics in Redis
   * Used for dashboards and instant feedback
   */
  async updateRealTimeMetrics(event) {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const hour = new Date().getHours();

      // Increment event counter
      await cache.incr(`analytics:events:${today}`, 1, 24 * 60 * 60);

      // Increment event type counter
      await cache.incr(`analytics:${event.eventType}:${today}`, 1, 24 * 60 * 60);

      // Track unique users (using sorted set)
      if (event.userId) {
        await cache.client.zadd(
          `analytics:unique_users:${today}`,
          Date.now(),
          event.userId.toString()
        );
        await cache.client.expire(`analytics:unique_users:${today}`, 24 * 60 * 60);
      }

      // Track hourly distribution
      await cache.incr(`analytics:hourly:${today}:${hour}`, 1, 24 * 60 * 60);

      // Event-specific counters
      if (event.eventType === 'order:created') {
        const orderAmount = event.data.amount || 0;
        await cache.incr(`analytics:revenue:${today}`, orderAmount, 24 * 60 * 60);
        await cache.incr(`analytics:orders:${today}`, 1, 24 * 60 * 60);
      }

      if (event.eventType === 'search:query_submitted') {
        const query = event.data.query || '';
        if (query) {
          await cache.client.zincrby('analytics:popular_searches:7d', 1, query.toLowerCase());
          await cache.client.expire('analytics:popular_searches:7d', 7 * 24 * 60 * 60);
        }
      }
    } catch (error) {
      logger.error('Failed to update real-time metrics', {
        error: error.message,
        eventType: event.eventType,
      });
      // Don't throw - metrics failures shouldn't break tracking
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  async getRealTimeMetrics() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        eventsToday,
        ordersToday,
        revenueToday,
        uniqueUsersToday,
        popularSearches,
      ] = await Promise.all([
        cache.get(`analytics:events:${today}`) || '0',
        cache.get(`analytics:orders:${today}`) || '0',
        cache.get(`analytics:revenue:${today}`) || '0',
        cache.client.zcard(`analytics:unique_users:${today}`),
        cache.client.zrevrange('analytics:popular_searches:7d', 0, 9, 'WITHSCORES'),
      ]);

      // Format popular searches
      const searches = [];
      for (let i = 0; i < popularSearches.length; i += 2) {
        searches.push({
          query: popularSearches[i],
          count: parseInt(popularSearches[i + 1]),
        });
      }

      return {
        success: true,
        data: {
          eventsToday: parseInt(eventsToday),
          ordersToday: parseInt(ordersToday),
          revenueToday: parseFloat(revenueToday),
          uniqueUsersToday: uniqueUsersToday || 0,
          popularSearches: searches,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      logger.error('Failed to get real-time metrics', {
        error: error.message,
        stack: error.stack,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get aggregated metrics for a date range
   */
  async getMetrics(query) {
    try {
      const {
        startDate,
        endDate,
        eventTypes,
        groupBy = 'day',
        userId,
        sessionId,
      } = query;

      const matchStage = {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      if (eventTypes && eventTypes.length > 0) {
        matchStage.eventType = { $in: eventTypes };
      }

      if (userId) {
        matchStage.userId = userId;
      }

      if (sessionId) {
        matchStage.sessionId = sessionId;
      }

      // Build group by clause
      let groupByClause;
      if (groupBy === 'hour') {
        groupByClause = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' },
        };
      } else if (groupBy === 'day') {
        groupByClause = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
        };
      } else if (groupBy === 'month') {
        groupByClause = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
        };
      } else {
        groupByClause = null; // Total
      }

      const results = await AnalyticsEvent.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: groupByClause,
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            eventTypes: { $push: '$eventType' },
          },
        },
        {
          $project: {
            _id: 1,
            count: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            eventTypes: 1,
          },
        },
        { $sort: { '_id': 1 } },
      ]);

      return { success: true, data: results };
    } catch (error) {
      logger.error('Failed to get metrics', {
        error: error.message,
        query,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user journey (session-based)
   */
  async getUserJourney(sessionId) {
    try {
      const events = await AnalyticsEvent.getUserJourney(sessionId);

      return {
        success: true,
        data: {
          sessionId,
          eventCount: events.length,
          events,
          duration: this.calculateSessionDuration(events),
        },
      };
    } catch (error) {
      logger.error('Failed to get user journey', {
        error: error.message,
        sessionId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get funnel conversion analysis
   */
  async getFunnelAnalysis(funnelSteps, startDate, endDate) {
    try {
      const results = await AnalyticsEvent.getFunnelConversion(
        funnelSteps,
        new Date(startDate),
        new Date(endDate)
      );

      // Calculate conversion rates
      const funnel = [];
      let previousCount = null;

      for (const step of funnelSteps) {
        const count = results[step] || 0;
        const conversionRate = previousCount ? (count / previousCount) * 100 : 100;

        funnel.push({
          step,
          count,
          conversionRate: Math.round(conversionRate * 100) / 100,
        });

        previousCount = count;
      }

      return { success: true, data: funnel };
    } catch (error) {
      logger.error('Failed to get funnel analysis', {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get partner performance analytics
   */
  async getPartnerPerformance(partnerId, startDate, endDate) {
    try {
      const results = await AnalyticsEvent.aggregate([
        {
          $match: {
            $or: [
              { 'data.partnerId': partnerId },
              { 'data.foodPartner': partnerId },
            ],
            timestamp: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          },
        },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$eventType', 'order:created'] },
                  { $ifNull: ['$data.amount', 0] },
                  0,
                ],
              },
            },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            eventType: '$_id',
            count: 1,
            totalRevenue: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
          },
        },
      ]);

      return { success: true, data: results };
    } catch (error) {
      logger.error('Failed to get partner performance', {
        error: error.message,
        partnerId,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get event distribution by category
   */
  async getEventDistribution(startDate, endDate) {
    try {
      const results = await AnalyticsEvent.aggregate([
        {
          $match: {
            timestamp: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          },
        },
        {
          $group: {
            _id: '$eventCategory',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return { success: true, data: results };
    } catch (error) {
      logger.error('Failed to get event distribution', {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Calculate session duration
   */
  calculateSessionDuration(events) {
    if (events.length < 2) return 0;

    const first = new Date(events[0].timestamp);
    const last = new Date(events[events.length - 1].timestamp);

    return Math.round((last - first) / 1000); // Duration in seconds
  }

  /**
   * Clean up old events (manual trigger, also handled by TTL index)
   */
  async cleanupOldEvents(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await AnalyticsEvent.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      logger.info('Old analytics events cleaned up', {
        deleted: result.deletedCount,
        cutoffDate,
      });

      return { success: true, deleted: result.deletedCount };
    } catch (error) {
      logger.error('Failed to cleanup old events', {
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AnalyticsService();
