const AppError = require('../utils/AppError');

function handleServiceError(err, context = '') {
  // Optionally add more context or logging here
  throw new AppError(
    context ? `${context}: ${err.message}` : err.message,
    err.statusCode || 500
  );
}

module.exports = handleServiceError;
