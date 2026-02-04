/**
 * @fileoverview Request ID Middleware for Distributed Tracing
 * @description Generates unique request IDs for every incoming HTTP request,
 *              enabling end-to-end request tracing across services and async operations
 */

const { uuidv4 } = require('../utils/uuid');
const logger = require('../services/logger.service');

/**
 * Request ID Middleware
 * 
 * Generates a unique request ID for each incoming request and:
 * - Adds it to req.id for use in controllers/services
 * - Adds it to response header (X-Request-ID) for client tracking
 * - Creates request-scoped logger (req.logger) with requestId preset
 * 
 * Supports existing X-Request-ID header (for distributed tracing across services)
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requestIdMiddleware = (req, res, next) => {
  // Check if request ID already exists (from upstream service or load balancer)
  const existingRequestId = req.get('X-Request-ID');
  const requestId = existingRequestId || `req-${uuidv4()}`;

  // Add request ID to request object
  req.id = requestId;

  // Add request ID to response header (for client-side tracing)
  res.setHeader('X-Request-ID', requestId);

  // Create request-scoped logger with requestId preset
  // This allows controllers to use req.logger.info() without manually passing requestId
  req.logger = logger.createChild({
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
  });

  // Log request start (optional, Morgan will also log this)
  req.logger.http(`${req.method} ${req.originalUrl || req.url}`, {
    headers: {
      'user-agent': req.get('user-agent'),
      'content-type': req.get('content-type'),
    },
    query: req.query,
  });

  // Capture response finish to log completion
  const originalEnd = res.end;
  const startTime = Date.now();

  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log response completion
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';
    req.logger[logLevel](`${req.method} ${req.originalUrl || req.url} - ${statusCode}`, {
      statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    });

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = requestIdMiddleware;
