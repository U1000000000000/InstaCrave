
const Joi = require('joi');
const sanitize = require('./sanitize');


const editFoodPartnerSchema = Joi.object({
  name: Joi.string().min(3).max(50).custom(sanitize),
  contactName: Joi.string().min(3).max(50).custom(sanitize),
  email: Joi.string().email(),
  address: Joi.string().min(5).max(200).custom(sanitize),
  phone: Joi.string().min(8).max(15),
  profileImage: Joi.string().uri(),
  password: Joi.string().min(6),
}).unknown(false);

module.exports = {
  editFoodPartnerSchema,
};
