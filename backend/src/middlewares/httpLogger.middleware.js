/**
 * @fileoverview HTTP Request Logging Middleware with Morgan
 * @description Logs all HTTP requests and responses with detailed metrics
 */

const morgan = require('morgan');
const logger = require('../services/logger.service');

/**
 * Custom Morgan token for request ID
 */
morgan.token('request-id', (req) => req.id || 'unknown');

/**
 * Custom Morgan token for user ID
 */
morgan.token('user-id', (req) => req.user?.id || 'anonymous');

/**
 * Custom Morgan format for production
 * Includes: method, URL, status, response time, content length, request ID, user ID
 */
const productionFormat =
  ':method :url :status :response-time ms - :res[content-length] bytes - :request-id - user::user-id';

/**
 * Custom Morgan format for development
 * Includes: method, URL, status, response time, request ID
 */
const developmentFormat = ':method :url :status :response-time ms - :request-id';

/**
 * Morgan stream to Winston logger
 * Redirects Morgan output to Winston instead of console
 */
const stream = {
  write: (message) => {
    // Remove trailing newline
    const logMessage = message.trim();

    // Parse status code from Morgan message to determine log level
    const statusMatch = logMessage.match(/\s(\d{3})\s/);
    const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

    // Determine log level based on status code
    let level = 'http';
    if (statusCode >= 500) level = 'error';
    else if (statusCode >= 400) level = 'warn';

    logger[level](logMessage, { httpMetric: true });
  },
};

/**
 * Get Morgan middleware based on environment
 */
const getHttpLogger = () => {
  const format = process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat;

  return morgan(format, {
    stream,
    skip: (req) => {
      // Skip health check endpoints to avoid noise
      return req.url === '/health' || req.url === '/api/health';
    },
  });
};

module.exports = getHttpLogger();
