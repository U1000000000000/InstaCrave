// backend/src/middlewares/queryValidation.middleware.js
const queryValidation = require('../validation/query.validation');
const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  const { error } = queryValidation.validate(req.query);
  if (error) {
    return next(new AppError('Invalid query parameters', 400, error.details.map(d => d.message)));
  }
  next();
};
