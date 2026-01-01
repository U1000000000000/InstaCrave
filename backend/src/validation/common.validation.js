// Strict schemas to block all unexpected fields
const Joi = require('joi');
const emptyQuerySchema = Joi.object({}).unknown(false);
const emptyParamsSchema = Joi.object({}).unknown(false);
const emptyBodySchema = Joi.object({}).unknown(false);

// Example: Validate MongoDB ObjectId in params
const objectIdSchema = Joi.object({
  id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
}).unknown(false);

// Validate foodId in params
const foodIdParamsSchema = Joi.object({
  foodId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
}).unknown(false);

// Example: Pagination query params
const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  skip: Joi.number().integer().min(0).default(0),
  sort: Joi.string().optional(),
  filter: Joi.string().optional(),
}).unknown(false);

module.exports = {
  objectIdSchema,
  paginationQuerySchema,
  emptyQuerySchema,
  emptyParamsSchema,
  emptyBodySchema,
};
