const Joi = require('joi');
const sanitize = require('./sanitize');

/**
 * Cart Validation Schemas (Joi)
 */

// MongoDB ObjectId validation pattern
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// Add item to cart
const addItemSchema = Joi.object({
  foodId: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid food ID format',
      'any.required': 'Food ID is required',
    }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(99)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Maximum quantity per item is 99',
      'any.required': 'Quantity is required',
    }),
}).unknown(false);

// Update cart item quantity
const updateItemSchema = Joi.object({
  quantity: Joi.number()
    .integer()
    .min(0)
    .max(99)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity cannot be negative',
      'number.max': 'Maximum quantity per item is 99',
      'any.required': 'Quantity is required',
    }),
}).unknown(false);

// Food ID in params
const foodIdParamsSchema = Joi.object({
  foodId: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid food ID format',
      'any.required': 'Food ID is required',
    }),
}).unknown(false);

// Empty query/body for GET/DELETE operations
const emptyQuerySchema = Joi.object({}).unknown(false);
const emptyParamsSchema = Joi.object({}).unknown(false);

// Cart checkout (for future use when integrated with orders)
const checkoutSchema = Joi.object({
  deliveryAddress: Joi.string()
    .min(10)
    .max(200)
    .required()
    .custom(sanitize)
    .messages({
      'string.min': 'Delivery address must be at least 10 characters',
      'string.max': 'Delivery address cannot exceed 200 characters',
      'any.required': 'Delivery address is required',
    }),
  notes: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .custom(sanitize)
    .messages({
      'string.max': 'Notes cannot exceed 500 characters',
    }),
  paymentMethod: Joi.string()
    .valid('cash', 'card', 'wallet', 'upi')
    .optional()
    .default('cash')
    .messages({
      'any.only': 'Invalid payment method',
    }),
}).unknown(false);

module.exports = {
  addItemSchema,
  updateItemSchema,
  foodIdParamsSchema,
  emptyQuerySchema,
  emptyParamsSchema,
  checkoutSchema,
};
