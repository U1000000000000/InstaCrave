const Joi = require('joi');
const sanitize = require('./sanitize');

const createOrderSchema = Joi.object({
  foodId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid food ID format',
      'any.required': 'Food ID is required',
    }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 100',
      'any.required': 'Quantity is required',
    }),
  deliveryAddress: Joi.string()
    .min(10)
    .max(500)
    .required()
    .custom(sanitize)
    .messages({
      'string.min': 'Delivery address must be at least 10 characters',
      'string.max': 'Delivery address cannot exceed 500 characters',
      'any.required': 'Delivery address is required',
    }),
  paymentMethod: Joi.string()
    .valid('card', 'wallet', 'upi', 'cash_on_delivery')
    .default('cash_on_delivery')
    .messages({
      'any.only': 'Invalid payment method',
    }),
  notes: Joi.string()
    .allow('')
    .max(500)
    .optional(),
  expectedPrice: Joi.number()
    .min(0)
    .optional(),
  idempotencyKey: Joi.string()
    .max(128)
    .optional(),
}).unknown(false);

const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')
    .required()
    .messages({
      'any.only': 'Invalid status',
      'any.required': 'Status is required',
    }),
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 500 characters',
    }),
}).unknown(false);

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
};
