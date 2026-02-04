
const Joi = require('joi');
const sanitize = require('./sanitize');

// For routes: /like, /save, /comment, /delete-comment, /share

const foodIdBodySchema = Joi.object({
  foodId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
}).unknown(false);


const commentOnFoodSchema = Joi.object({
  foodId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  comment: Joi.string().min(1).max(500).required().custom(sanitize),
}).unknown(false);

const deleteCommentSchema = Joi.object({
  commentId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
}).unknown(false);

module.exports = {
  foodIdBodySchema,
  commentOnFoodSchema,
  deleteCommentSchema,
};
