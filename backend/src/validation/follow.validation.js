const Joi = require('joi');

const followFoodPartnerSchema = Joi.object({
  foodpartner: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
}).unknown(false);

module.exports = {
  followFoodPartnerSchema,
};
