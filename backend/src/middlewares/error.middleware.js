// Centralized error handling middleware for Express
const responseUtil = require('../utils/response');
const logger = require('../services/logger.service');

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const details = [];
  if (err.code) details.push({ code: err.code });
  // Only include stack in non-production and for 5xx errors
  if (process.env.NODE_ENV !== 'production' && err.stack && statusCode >= 500) details.push({ stack: err.stack });

  // Logging: minimal for 401/403, full for others
  if (statusCode === 401 || statusCode === 403) {
    // Log only summary for expected auth errors
    logger.info('Authentication/authorization error', {
      statusCode,
      message,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
  } else {
    // Log full error for unexpected/5xx
    logger.error('Request error', {
      statusCode,
      message,
      method: req.method,
      url: req.originalUrl,
      stack: err.stack,
    });
  }

  responseUtil.sendErrorResponse(res, {
    message,
    status: statusCode,
    details,
  });
};
