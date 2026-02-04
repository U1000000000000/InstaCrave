/**
 * @fileoverview Analytics Event Model
 * @description Stores analytics events with automatic TTL-based cleanup
 */

const mongoose = require('mongoose');
const {
  ALL_EVENT_TYPES,
  EVENT_CATEGORIES,
  getCategoryForEvent,
} = require('../constants/analytics.constants');

/**
 * Analytics Event Schema
 * 
 * Optimizations:
 * - Compound indexes for common query patterns
 * - TTL index for automatic cleanup (90 days retention)
 * - Sparse indexes for optional fields
 * - Mixed type for flexible event data
 */
const analyticsEventSchema = new mongoose.Schema(
  {
    // ==================== Event Identity ====================
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      index: true,
      enum: Object.values(ALL_EVENT_TYPES),
      validate: {
        validator: function (v) {
          return Object.values(ALL_EVENT_TYPES).includes(v);
        },
        message: (props) => `${props.value} is not a valid event type`,
      },
    },

    eventCategory: {
      type: String,
      required: true,
      enum: Object.values(EVENT_CATEGORIES),
      index: true,
    },

    // ==================== Timing ====================
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    sessionId: {
      type: String,
      index: true,
      sparse: true,
    },

    // ==================== User Context ====================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userType',
      sparse: true, // null for anonymous users
      index: true,
    },

    userType: {
      type: String,
      enum: ['User', 'FoodPartner', null],
      default: null,
    },

    isAnonymous: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ==================== Technical Context ====================
    device: {
      type: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'unknown'],
        default: 'unknown',
      },
      os: {
        type: String,
        maxlength: 100,
      },
      browser: {
        type: String,
        maxlength: 100,
      },
      screenSize: {
        type: String,
        maxlength: 50,
      },
      userAgent: {
        type: String,
        maxlength: 500,
      },
    },

    // ==================== Geographic Context ====================
    location: {
      ip: {
        type: String,
        maxlength: 45, // IPv6 max length
      },
      country: {
        type: String,
        maxlength: 100,
      },
      city: {
        type: String,
        maxlength: 100,
      },
      timezone: {
        type: String,
        maxlength: 50,
      },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          index: '2dsphere',
        },
      },
    },

    // ==================== Event-Specific Data ====================
    /**
     * Flexible JSON field for event-specific data
     * Examples:
     * - order:created → { orderId, amount, items, paymentMethod }
     * - search:query_submitted → { query, resultsCount, filters }
     * - food:item_viewed → { foodId, partnerId, price }
     */
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ==================== Funnel Tracking ====================
    funnel: {
      step: {
        type: String,
        maxlength: 50,
      },
      previousStep: {
        type: String,
        maxlength: 50,
      },
      source: {
        type: String,
        maxlength: 100,
        index: true, // For attribution queries
      },
      campaign: {
        type: String,
        maxlength: 100,
        index: true, // For campaign tracking
      },
      medium: {
        type: String,
        maxlength: 50,
      },
      referrer: {
        type: String,
        maxlength: 500,
      },
    },

    // ==================== Performance Metrics ====================
    performance: {
      pageLoadTime: {
        type: Number,
        min: 0,
      },
      apiResponseTime: {
        type: Number,
        min: 0,
      },
      renderTime: {
        type: Number,
        min: 0,
      },
      ttfb: {
        // Time to First Byte
        type: Number,
        min: 0,
      },
    },

    // ==================== Error Context (for error events) ====================
    error: {
      message: {
        type: String,
        maxlength: 500,
      },
      stack: {
        type: String,
        maxlength: 2000,
      },
      code: {
        type: String,
        maxlength: 50,
      },
      statusCode: {
        type: Number,
      },
    },

    // ==================== Additional Metadata ====================
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ==================== Data Quality ====================
    isValidated: {
      type: Boolean,
      default: true,
    },

    isDuplicate: {
      type: Boolean,
      default: false,
    },

    processingStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'processed',
    },
  },
  {
    timestamps: false, // We manage timestamp manually
    collection: 'analytics_events',
    strict: false, // Allow flexible data field
  }
);

// ==================== INDEXES ====================

/**
 * Compound indexes for common query patterns
 * Priority: Most frequent queries first
 */

// 1. Event type + time range (most common: "show me all order events today")
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });

// 2. User + time range (user activity timeline)
analyticsEventSchema.index({ userId: 1, timestamp: -1 });

// 3. Session + time range (session replay, user journey)
analyticsEventSchema.index({ sessionId: 1, timestamp: -1 });

// 4. Category + time range (category-based reporting)
analyticsEventSchema.index({ eventCategory: 1, timestamp: -1 });

// 5. Funnel source + campaign (attribution analysis)
analyticsEventSchema.index({ 'funnel.source': 1, 'funnel.campaign': 1, timestamp: -1 });

// 6. Anonymous vs authenticated (segment analysis)
analyticsEventSchema.index({ isAnonymous: 1, timestamp: -1 });

/**
 * TTL Index for automatic data cleanup
 * Automatically deletes events older than 90 days (configurable via env)
 */
const retentionDays = parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 90;
analyticsEventSchema.index(
  { timestamp: 1 },
  {
    expireAfterSeconds: retentionDays * 24 * 60 * 60,
    name: 'analytics_ttl_index',
  }
);

/**
 * Geospatial index for location-based queries
 */
analyticsEventSchema.index({ 'location.coordinates': '2dsphere' });

// ==================== VIRTUAL FIELDS ====================

/**
 * Day of week (0-6, Sunday-Saturday)
 */
analyticsEventSchema.virtual('dayOfWeek').get(function () {
  return this.timestamp ? this.timestamp.getDay() : null;
});

/**
 * Hour of day (0-23)
 */
analyticsEventSchema.virtual('hourOfDay').get(function () {
  return this.timestamp ? this.timestamp.getHours() : null;
});

/**
 * Date only (YYYY-MM-DD)
 */
analyticsEventSchema.virtual('date').get(function () {
  if (!this.timestamp) return null;
  return this.timestamp.toISOString().split('T')[0];
});

// ==================== INSTANCE METHODS ====================

/**
 * Get event age in hours
 */
analyticsEventSchema.methods.getAgeInHours = function () {
  return (Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60);
};

/**
 * Check if event is recent (< 1 hour old)
 */
analyticsEventSchema.methods.isRecent = function () {
  return this.getAgeInHours() < 1;
};

/**
 * Get sanitized version (remove PII)
 */
analyticsEventSchema.methods.getSanitized = function () {
  const obj = this.toObject();
  
  // Remove PII fields
  if (obj.location) {
    delete obj.location.ip;
    delete obj.location.coordinates;
  }
  
  if (obj.device) {
    delete obj.device.userAgent;
  }
  
  return obj;
};

// ==================== STATIC METHODS ====================

/**
 * Get events by type in time range
 */
analyticsEventSchema.statics.getEventsByType = function (eventType, startDate, endDate) {
  return this.find({
    eventType,
    timestamp: { $gte: startDate, $lte: endDate },
  })
    .sort({ timestamp: -1 })
    .lean();
};

/**
 * Get user journey (session-based)
 */
analyticsEventSchema.statics.getUserJourney = function (sessionId) {
  return this.find({ sessionId })
    .sort({ timestamp: 1 })
    .lean();
};

/**
 * Get events for user
 */
analyticsEventSchema.statics.getUserEvents = function (userId, limit = 100) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

/**
 * Count events by type
 */
analyticsEventSchema.statics.countByType = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

/**
 * Get funnel conversion rates
 */
analyticsEventSchema.statics.getFunnelConversion = async function (funnelSteps, startDate, endDate) {
  const results = {};

  for (const step of funnelSteps) {
    const count = await this.countDocuments({
      'funnel.step': step,
      timestamp: { $gte: startDate, $lte: endDate },
    });
    results[step] = count;
  }

  return results;
};

/**
 * Get unique users count
 */
analyticsEventSchema.statics.getUniqueUsersCount = function (startDate, endDate) {
  return this.distinct('userId', {
    timestamp: { $gte: startDate, $lte: endDate },
    userId: { $ne: null },
  });
};

/**
 * Bulk insert events (optimized for high-volume writes)
 */
analyticsEventSchema.statics.bulkInsertEvents = function (events) {
  return this.insertMany(events, {
    ordered: false, // Continue on error
    lean: true,
  });
};

// ==================== MIDDLEWARE ====================

/**
 * Pre-save hook: Auto-set event category if not provided
 */
analyticsEventSchema.pre('save', function (next) {
  if (!this.eventCategory && this.eventType) {
    this.eventCategory = getCategoryForEvent(this.eventType);
  }
  next();
});

/**
 * Pre-save hook: Generate eventId if not provided
 */
analyticsEventSchema.pre('save', function (next) {
  if (!this.eventId) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  next();
});

// ==================== MODEL ====================

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

module.exports = AnalyticsEvent;
