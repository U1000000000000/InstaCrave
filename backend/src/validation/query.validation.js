// backend/src/validation/query.validation.js
const Joi = require('joi');

const queryValidation = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  skip: Joi.number().integer().min(0).optional(),
  sort: Joi.string().pattern(/^[-,a-zA-Z0-9_]+$/).optional(),
  // Add filter fields below, example:
  price: Joi.number().optional(),
  name: Joi.string().optional(),
  category: Joi.string().optional(),
  foodPartner: Joi.string().optional(),
  isOrderable: Joi.boolean().optional(),
  // Range query operators for numeric fields
  'price[gte]': Joi.number().optional(),
  'price[lte]': Joi.number().optional(),
  'price[gt]': Joi.number().optional(),
  'price[lt]': Joi.number().optional(),
  // For GET /comment endpoint
  foodId: Joi.string().optional(),
  // ...extend per endpoint/model
});

module.exports = queryValidation;
