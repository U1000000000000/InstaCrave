const Joi = require('joi');
const sanitize = require('./sanitize');


const createFoodSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().custom(sanitize),
  // video is not required on creation, it is set after file upload
  description: Joi.string().max(500).optional().custom(sanitize),
  isOrderable: Joi.boolean().optional(),
  price: Joi.number().min(0).optional(),
}).unknown(false);


const updateFoodSchema = Joi.object({
  name: Joi.string().min(2).max(100).custom(sanitize),
  video: Joi.string().uri(),
  description: Joi.string().max(500).custom(sanitize),
  isOrderable: Joi.boolean(),
  price: Joi.number().min(0),
}).unknown(false);

module.exports = {
  createFoodSchema,
  updateFoodSchema,
};
