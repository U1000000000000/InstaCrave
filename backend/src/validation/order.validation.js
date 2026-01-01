
const Joi = require('joi');
const sanitize = require('./sanitize');


const createOrderSchema = Joi.object({
  foodId: Joi.string().required(), // foodId as per model
  quantity: Joi.number().integer().min(1).required(),
  deliveryAddress: Joi.string().min(5).required().custom(sanitize),
  notes: Joi.string().allow('').optional(),
}).unknown(false);

const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled').required(),
}).unknown(false);

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
};
