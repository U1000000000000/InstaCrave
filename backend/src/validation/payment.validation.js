const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

/**
 * Payment Validation Schemas
 * 
 * Input validation for payment operations using Joi
 */

// Custom sanitization function
const sanitize = (value) => {
  if (typeof value === 'string') {
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
  }
  return value;
};

// Credit card validation schema
const creditCardSchema = Joi.object({
  cardNumber: Joi.string()
    .required()
    .pattern(/^\d{13,19}$/)
    .messages({
      'string.pattern.base': 'Card number must be between 13-19 digits',
      'any.required': 'Card number is required',
    }),
  
  cardholderName: Joi.string()
    .required()
    .min(2)
    .max(100)
    .external(async (value) => {
      const sanitized = sanitize(value);
      if (sanitized !== value) {
        throw new Error('Card holder name contains invalid characters');
      }
    })
    .messages({
      'string.min': 'Cardholder name must be at least 2 characters',
      'string.max': 'Cardholder name cannot exceed 100 characters',
      'any.required': 'Cardholder name is required',
    }),
  
  expiryMonth: Joi.string()
    .required()
    .pattern(/^(0[1-9]|1[0-2])$/)
    .messages({
      'string.pattern.base': 'Expiry month must be between 01-12',
      'any.required': 'Expiry month is required',
    }),
  
  expiryYear: Joi.string()
    .required()
    .pattern(/^\d{4}$/)
    .custom((value, helpers) => {
      const currentYear = new Date().getFullYear();
      const year = parseInt(value);
      
      if (year < currentYear) {
        return helpers.error('any.invalid');
      }
      
      if (year > currentYear + 20) {
        return helpers.error('any.invalid');
      }
      
      return value;
    })
    .messages({
      'any.invalid': 'Expiry year must be valid and not more than 20 years in future',
      'any.required': 'Expiry year is required',
    }),
  
  cvv: Joi.string()
    .required()
    .pattern(/^\d{3,4}$/)
    .messages({
      'string.pattern.base': 'CVV must be 3-4 digits',
      'any.required': 'CVV is required',
    }),
  
  billingZipCode: Joi.string()
    .required()
    .max(20)
    .messages({
      'string.max': 'Billing ZIP code cannot exceed 20 characters',
      'any.required': 'Billing ZIP code is required',
    }),
});

// Wallet validation schema
const walletSchema = Joi.object({
  walletId: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .messages({
      'string.pattern.base': 'Invalid wallet ID format',
      'any.required': 'Wallet ID is required',
    }),
  
  pinCode: Joi.string()
    .required()
    .pattern(/^\d{4}$/)
    .messages({
      'string.pattern.base': 'PIN must be 4 digits',
      'any.required': 'PIN is required',
    }),
});

// UPI validation schema
const upiSchema = Joi.object({
  upiId: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z]+$/)
    .messages({
      'string.pattern.base': 'Invalid UPI ID format (e.g., username@bank)',
      'any.required': 'UPI ID is required',
    }),
  
  pin: Joi.string()
    .required()
    .pattern(/^\d{4,6}$/)
    .messages({
      'string.pattern.base': 'UPI PIN must be 4-6 digits',
      'any.required': 'UPI PIN is required',
    }),
});

// Payment metadata schema
const metadataSchema = Joi.object({
  ipAddress: Joi.string()
    .ip()
    .optional()
    .messages({
      'string.ip': 'Invalid IP address format',
    }),
  
  userAgent: Joi.string()
    .max(500)
    .optional(),
  
  deviceId: Joi.string()
    .max(100)
    .optional(),
  
  country: Joi.string()
    .length(2)
    .uppercase()
    .optional(),
  
  timezone: Joi.string()
    .optional(),
}).unknown(false);

// Initiate payment schema
const initiatePaymentSchema = Joi.object({
  cartId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid cart ID format',
      'any.required': 'Cart ID is required',
    }),
  
  paymentMethod: Joi.string()
    .required()
    .valid('card', 'wallet', 'upi', 'cash_on_delivery')
    .messages({
      'any.only': 'Payment method must be one of: card, wallet, upi, cash_on_delivery',
      'any.required': 'Payment method is required',
    }),
  
  amount: Joi.number()
    .required()
    .positive()
    .max(10000)
    .messages({
      'number.positive': 'Amount must be greater than 0',
      'number.max': 'Amount cannot exceed $10,000',
      'any.required': 'Amount is required',
    }),
  
  currency: Joi.string()
    .optional()
    .default('USD')
    .valid('USD', 'EUR', 'GBP', 'INR'),
  
  deliveryAddress: Joi.string()
    .required()
    .min(10)
    .max(500)
    .external(async (value) => {
      const sanitized = sanitize(value);
      if (sanitized !== value) {
        throw new Error('Delivery address contains invalid characters');
      }
    })
    .messages({
      'string.min': 'Delivery address must be at least 10 characters',
      'string.max': 'Delivery address cannot exceed 500 characters',
      'any.required': 'Delivery address is required',
    }),
  
  cardData: Joi.when('paymentMethod', {
    is: 'card',
    then: creditCardSchema.required(),
    otherwise: Joi.forbidden(),
  }),
  
  walletData: Joi.when('paymentMethod', {
    is: 'wallet',
    then: walletSchema.required(),
    otherwise: Joi.forbidden(),
  }),
  
  upiData: Joi.when('paymentMethod', {
    is: 'upi',
    then: upiSchema.required(),
    otherwise: Joi.forbidden(),
  }),
  
  metadata: metadataSchema.optional(),
  
  sessionId: Joi.string()
    .optional()
    .allow(null),
}).unknown(false);

// Process payment schema
const processPaymentSchema = Joi.object({
  paymentId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid payment ID format',
      'any.required': 'Payment ID is required',
    }),
  
  cardData: Joi.object({
    cardNumber: Joi.string()
      .required()
      .pattern(/^\d{13,19}$/),
    last4Digits: Joi.string()
      .pattern(/^\d{4}$/),
    brand: Joi.string(),
    expiryMonth: Joi.string(),
    expiryYear: Joi.string(),
  })
    .optional()
    .unknown(false),
}).unknown(false);

// Get payment status schema
const getPaymentStatusSchema = Joi.object({
  paymentId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid payment ID format',
      'any.required': 'Payment ID is required',
    }),
}).unknown(false);

// Refund schema
const refundPaymentSchema = Joi.object({
  paymentId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid payment ID format',
      'any.required': 'Payment ID is required',
    }),
  
  amount: Joi.number()
    .required()
    .positive()
    .messages({
      'number.positive': 'Refund amount must be greater than 0',
      'any.required': 'Refund amount is required',
    }),
  
  reason: Joi.string()
    .required()
    .valid('user_request', 'order_cancellation', 'merchant_error', 'duplicate', 'other')
    .messages({
      'any.only': 'Reason must be one of: user_request, order_cancellation, merchant_error, duplicate, other',
      'any.required': 'Reason is required',
    }),
  
  notes: Joi.string()
    .optional()
    .max(500)
    .external(async (value) => {
      if (value) {
        const sanitized = sanitize(value);
        if (sanitized !== value) {
          throw new Error('Notes contain invalid characters');
        }
      }
    })
    .messages({
      'string.max': 'Notes cannot exceed 500 characters',
    }),
}).unknown(false);

// Webhook schema
const webhookSchema = Joi.object({
  event: Joi.string()
    .required()
    .valid('payment.success', 'payment.failed', 'refund.completed', 'refund.failed')
    .messages({
      'any.only': 'Invalid webhook event type',
      'any.required': 'Event is required',
    }),
  
  transactionId: Joi.string()
    .required()
    .messages({
      'any.required': 'Transaction ID is required',
    }),
  
  paymentId: Joi.string()
    .optional()
    .pattern(/^[0-9a-fA-F]{24}$/),
  
  refundId: Joi.string()
    .optional(),
  
  status: Joi.string()
    .required()
    .valid('success', 'failed', 'pending')
    .messages({
      'any.only': 'Status must be one of: success, failed, pending',
      'any.required': 'Status is required',
    }),
  
  reason: Joi.string()
    .optional()
    .max(500),
  
  code: Joi.string()
    .optional()
    .max(100),
  
  timestamp: Joi.date()
    .optional()
    .default(() => new Date()),
}).unknown(false);

// Query schema for payment stats
const paymentStatsSchema = Joi.object({
  startDate: Joi.date()
    .required()
    .messages({
      'any.required': 'Start date is required',
    }),
  
  endDate: Joi.date()
    .required()
    .min(Joi.ref('startDate'))
    .messages({
      'any.required': 'End date is required',
      'date.min': 'End date must be after start date',
    }),
}).unknown(false);

// Common schemas for routes
const emptyQuerySchema = Joi.object({}).unknown(false);
const emptyParamsSchema = Joi.object({}).unknown(false);
const emptyBodySchema = Joi.object({}).unknown(false);

const paymentIdParamsSchema = Joi.object({
  paymentId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid payment ID format',
      'any.required': 'Payment ID is required',
    }),
}).unknown(false);

// Validation options
const validationOptions = {
  stripUnknown: true,
  presence: 'required',
  messages: {
    'any.required': '{#label} is required',
    'any.invalid': '{#label} is invalid',
  },
};

module.exports = {
  // Schemas
  initiatePaymentSchema,
  processPaymentSchema,
  getPaymentStatusSchema,
  refundPaymentSchema,
  webhookSchema,
  paymentStatsSchema,
  creditCardSchema,
  walletSchema,
  upiSchema,
  metadataSchema,
  emptyQuerySchema,
  emptyParamsSchema,
  emptyBodySchema,
  paymentIdParamsSchema,
  
  // Validation functions
  validateInitiatePayment: (data) => initiatePaymentSchema.validate(data, validationOptions),
  validateProcessPayment: (data) => processPaymentSchema.validate(data, validationOptions),
  validateGetPaymentStatus: (data) => getPaymentStatusSchema.validate(data, validationOptions),
  validateRefundPayment: (data) => refundPaymentSchema.validate(data, validationOptions),
  validateWebhook: (data) => webhookSchema.validate(data, validationOptions),
  validatePaymentStats: (data) => paymentStatsSchema.validate(data, validationOptions),
};
