/**
 * @fileoverview Analytics Validation Schemas
 * @description Joi validation schemas for analytics endpoints
 */

const Joi = require('joi');
const { ALL_EVENT_TYPES, EVENT_CATEGORIES } = require('../constants/analytics.constants');

/**
 * Track event validation
 */
const trackEventSchema = {
  body: Joi.object({
    eventType: Joi.string()
      .required()
      .valid(...Object.values(ALL_EVENT_TYPES))
      .messages({
        'any.required': 'Event type is required',
        'any.only': 'Invalid event type',
      }),

    sessionId: Joi.string().optional().max(100),

    data: Joi.object().optional().default({}),

    metadata: Joi.object().optional().default({}),

    funnel: Joi.object({
      step: Joi.string().max(50),
      previousStep: Joi.string().max(50),
      source: Joi.string().max(100),
      campaign: Joi.string().max(100),
      medium: Joi.string().max(50),
      referrer: Joi.string().max(500),
    }).optional(),

    performance: Joi.object({
      pageLoadTime: Joi.number().min(0),
      apiResponseTime: Joi.number().min(0),
      renderTime: Joi.number().min(0),
      ttfb: Joi.number().min(0),
    }).optional(),

    error: Joi.object({
      message: Joi.string().max(500),
      stack: Joi.string().max(2000),
      code: Joi.string().max(50),
      statusCode: Joi.number().integer(),
    }).optional(),
  }),
};

/**
 * Track batch events validation
 */
const trackEventsBatchSchema = {
  body: Joi.object({
    events: Joi.array()
      .items(
        Joi.object({
          eventType: Joi.string()
            .required()
            .valid(...Object.values(ALL_EVENT_TYPES)),
          data: Joi.object().optional().default({}),
          metadata: Joi.object().optional().default({}),
          sessionId: Joi.string().optional().max(100),
          funnel: Joi.object({
            step: Joi.string().max(50),
            previousStep: Joi.string().max(50),
            source: Joi.string().max(100),
            campaign: Joi.string().max(100),
          }).optional(),
        })
      )
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one event is required',
        'array.max': 'Maximum 100 events per batch',
        'any.required': 'Events array is required',
      }),
  }),
};

/**
 * Get metrics validation
 */
const getMetricsSchema = {
  query: Joi.object({
    startDate: Joi.date()
      .iso()
      .required()
      .messages({
        'any.required': 'Start date is required',
        'date.format': 'Start date must be a valid ISO date',
      }),

    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .required()
      .messages({
        'any.required': 'End date is required',
        'date.min': 'End date must be after start date',
        'date.format': 'End date must be a valid ISO date',
      }),

    eventTypes: Joi.string()
      .optional()
      .pattern(/^[a-z:_,]+$/)
      .messages({
        'string.pattern.base': 'Event types must be comma-separated',
      }),

    groupBy: Joi.string().valid('hour', 'day', 'month').optional().default('day'),

    userId: Joi.string().optional(),

    sessionId: Joi.string().optional().max(100),
  }),
};

/**
 * Get user journey validation
 */
const getUserJourneySchema = {
  params: Joi.object({
    sessionId: Joi.string()
      .required()
      .max(100)
      .messages({
        'any.required': 'Session ID is required',
        'string.max': 'Session ID must not exceed 100 characters',
      }),
  }),
};

/**
 * Get funnel analysis validation
 */
const getFunnelAnalysisSchema = {
  query: Joi.object({
    steps: Joi.string()
      .required()
      .pattern(/^[a-z_,]+$/)
      .messages({
        'any.required': 'Funnel steps are required',
        'string.pattern.base': 'Steps must be comma-separated',
      }),

    startDate: Joi.date()
      .iso()
      .required()
      .messages({
        'any.required': 'Start date is required',
        'date.format': 'Start date must be a valid ISO date',
      }),

    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .required()
      .messages({
        'any.required': 'End date is required',
        'date.min': 'End date must be after start date',
      }),
  }),
};

/**
 * Get partner performance validation
 */
const getPartnerPerformanceSchema = {
  params: Joi.object({
    partnerId: Joi.string()
      .required()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'any.required': 'Partner ID is required',
        'string.pattern.base': 'Invalid partner ID format',
      }),
  }),

  query: Joi.object({
    startDate: Joi.date()
      .iso()
      .required()
      .messages({
        'any.required': 'Start date is required',
      }),

    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .required()
      .messages({
        'any.required': 'End date is required',
        'date.min': 'End date must be after start date',
      }),
  }),
};

/**
 * Get event distribution validation
 */
const getEventDistributionSchema = {
  query: Joi.object({
    startDate: Joi.date()
      .iso()
      .required()
      .messages({
        'any.required': 'Start date is required',
      }),

    endDate: Joi.date()
      .iso()
      .min(Joi.ref('startDate'))
      .required()
      .messages({
        'any.required': 'End date is required',
        'date.min': 'End date must be after start date',
      }),
  }),
};

module.exports = {
  trackEventSchema,
  trackEventsBatchSchema,
  getMetricsSchema,
  getUserJourneySchema,
  getFunnelAnalysisSchema,
  getPartnerPerformanceSchema,
  getEventDistributionSchema,
};
