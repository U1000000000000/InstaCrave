
const Joi = require('joi');
const sanitize = require('./sanitize');

// TODO: Password validation is too weak - should enforce uppercase, numbers, special chars
// But annoying for development so keeping it simple for now

const registerUserSchema = Joi.object({
  fullName: Joi.string().min(3).max(50).required().custom(sanitize),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
}).unknown(false);

const loginUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
}).unknown(false);


const registerFoodPartnerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().custom(sanitize),
  contactName: Joi.string().min(3).max(50).required().custom(sanitize),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  address: Joi.string().min(5).max(200).required().custom(sanitize),
  phone: Joi.string().min(8).max(15).required(),
}).unknown(false);

const loginFoodPartnerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
}).unknown(false);

module.exports = {
  registerUserSchema,
  loginUserSchema,
  registerFoodPartnerSchema,
  loginFoodPartnerSchema,
};
