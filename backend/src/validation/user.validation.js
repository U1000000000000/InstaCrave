
const Joi = require('joi');
const sanitize = require('./sanitize');



const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(3).max(50).custom(sanitize),
  email: Joi.string().email(),
  password: Joi.string().min(6),
}).unknown(false);

module.exports = {
  updateProfileSchema,
};
