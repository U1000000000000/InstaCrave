const Joi = require('joi');

// Validation for /search endpoint
const searchQuerySchema = Joi.object({
  query: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'any.required': 'Query parameter is required',
      'string.empty': 'Query parameter is required',
      'string.min': 'Query parameter is required',
    }),
  type: Joi.string().valid('food', 'partner', 'all').default('all'),
}).unknown(false);

module.exports = {
  searchQuerySchema,
};
