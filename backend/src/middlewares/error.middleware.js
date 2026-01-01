// Centralized error handling middleware for Express
const responseUtil = require('../utils/response');

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const details = [];
  if (err.code) details.push({ code: err.code });
  // Only include stack in non-production and for 5xx errors
  if (process.env.NODE_ENV !== 'production' && err.stack && statusCode >= 500) details.push({ stack: err.stack });

  // Professional logging: minimal for 401/403, full for others
  if (statusCode === 401 || statusCode === 403) {
    // Log only summary for expected auth errors
    console.info(`[${new Date().toISOString()}] Auth error ${statusCode} at ${req.method} ${req.originalUrl} - ${message} - IP: ${req.ip}`);
  } else {
    // Log full error for unexpected/5xx
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${message}`);
    if (err.stack) console.error(err.stack);
  }

  responseUtil.sendErrorResponse(res, {
    message,
    status: statusCode,
    details,
  });
};
