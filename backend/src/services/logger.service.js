/**
 * @fileoverview Logging Service with Winston
 * @description Structured logging with request tracing, file rotation, and console output
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const chalk = require('chalk');

// =============================================================================
// CONFIGURATION
// =============================================================================

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(LOG_COLORS);

// Determine log level based on environment
const getLogLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// =============================================================================
// FORMATTERS
// =============================================================================

/**
 * Custom format for console output (colorized, human-readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, requestId, userId, ...metadata } = info;

    // Build log message
    let log = `${chalk.gray(timestamp)} [${level}]`;

    // Add request ID if available (critical for tracing)
    if (requestId) {
      log += ` ${chalk.cyan(`[${requestId}]`)}`;
    }

    // Add user ID if available
    if (userId) {
      log += ` ${chalk.blue(`[user:${userId}]`)}`;
    }

    // Add main message
    log += ` ${message}`;

    // Add metadata if present
    const metadataKeys = Object.keys(metadata);
    if (metadataKeys.length > 0) {
      // Filter out internal Winston fields
      const cleanMetadata = Object.fromEntries(
        Object.entries(metadata).filter(
          ([key]) => !['timestamp', 'level', 'message', 'stack', 'service'].includes(key)
        )
      );

      if (Object.keys(cleanMetadata).length > 0) {
        log += `\n${chalk.gray(JSON.stringify(cleanMetadata, null, 2))}`;
      }
    }

    // Add stack trace for errors
    if (info.stack) {
      log += `\n${chalk.red(info.stack)}`;
    }

    return log;
  })
);

/**
 * Format for file output (JSON for easy parsing)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// =============================================================================
// TRANSPORTS
// =============================================================================

/**
 * Console transport (development)
 */
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(winston.format.colorize({ all: true }), consoleFormat),
});

/**
 * Error file transport (rotates daily, keeps 30 days)
 */
const errorFileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '30d',
  maxSize: '20m',
  format: fileFormat,
  auditFile: path.join(LOG_DIR, '.error-audit.json'),
});

/**
 * Combined file transport (all logs, rotates daily, keeps 14 days)
 */
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d',
  maxSize: '20m',
  format: fileFormat,
  auditFile: path.join(LOG_DIR, '.combined-audit.json'),
});

/**
 * HTTP file transport (HTTP logs only, rotates daily, keeps 7 days)
 */
const httpFileTransport = new DailyRotateFile({
  filename: path.join(LOG_DIR, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'http',
  maxFiles: '7d',
  maxSize: '20m',
  format: fileFormat,
  auditFile: path.join(LOG_DIR, '.http-audit.json'),
});

// =============================================================================
// WINSTON LOGGER INSTANCE
// =============================================================================

const logger = winston.createLogger({
  level: getLogLevel(),
  levels: LOG_LEVELS,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
  ),
  defaultMeta: {
    service: 'instacrave-api',
    environment: process.env.NODE_ENV || 'development',
    hostname: require('os').hostname(),
  },
  transports: [
    consoleTransport,
    errorFileTransport,
    combinedFileTransport,
    httpFileTransport,
  ],
  exitOnError: false,
});

// =============================================================================
// HELPER METHODS
// =============================================================================

/**
 * Create a child logger with preset metadata (for request-scoped logging)
 * @param {Object} metadata - Metadata to include in all logs (e.g., requestId, userId)
 * @returns {Object} Child logger instance
 */
logger.createChild = function (metadata = {}) {
  return logger.child(metadata);
};

/**
 * Log performance metrics
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {Object} metadata - Additional metadata
 */
logger.performance = function (operation, duration, metadata = {}) {
  const level = duration > 1000 ? 'warn' : 'info';
  logger[level](`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    performanceMetric: true,
    ...metadata,
  });
};

/**
 * Log database queries
 * @param {string} query - Query description
 * @param {number} duration - Query duration in milliseconds
 * @param {Object} metadata - Additional metadata
 */
logger.query = function (query, duration, metadata = {}) {
  logger.debug(`Database Query: ${query}`, {
    query,
    duration: `${duration}ms`,
    queryMetric: true,
    ...metadata,
  });
};

/**
 * Log cache operations
 * @param {string} operation - Cache operation (hit, miss, set, delete)
 * @param {string} key - Cache key
 * @param {Object} metadata - Additional metadata
 */
logger.cache = function (operation, key, metadata = {}) {
  logger.debug(`Cache ${operation}: ${key}`, {
    operation,
    key,
    cacheMetric: true,
    ...metadata,
  });
};

/**
 * Log queue operations
 * @param {string} queueName - Queue name
 * @param {string} jobId - Job ID
 * @param {string} status - Job status (added, processing, completed, failed)
 * @param {Object} metadata - Additional metadata
 */
logger.queue = function (queueName, jobId, status, metadata = {}) {
  const level = status === 'failed' ? 'error' : 'info';
  logger[level](`Queue ${queueName}: ${status}`, {
    queueName,
    jobId,
    jobStatus: status,
    queueMetric: true,
    ...metadata,
  });
};

/**
 * Log security events
 * @param {string} event - Security event description
 * @param {Object} metadata - Additional metadata (IP, user, etc.)
 */
logger.security = function (event, metadata = {}) {
  logger.warn(`Security: ${event}`, {
    securityEvent: true,
    ...metadata,
  });
};

/**
 * Log business events (orders, payments, etc.)
 * @param {string} event - Business event description
 * @param {Object} metadata - Additional metadata
 */
logger.business = function (event, metadata = {}) {
  logger.info(`Business: ${event}`, {
    businessEvent: true,
    ...metadata,
  });
};

// =============================================================================
// EVENT HANDLERS
// =============================================================================

// Log file rotation events
errorFileTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Error log file rotated', { oldFilename, newFilename });
});

combinedFileTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Combined log file rotated', { oldFilename, newFilename });
});

httpFileTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('HTTP log file rotated', { oldFilename, newFilename });
});

// Handle transport errors
[errorFileTransport, combinedFileTransport, httpFileTransport].forEach((transport) => {
  transport.on('error', (error) => {
    console.error('Logger transport error:', error);
  });
});

// =============================================================================
// STARTUP MESSAGE
// =============================================================================

logger.info('Logger service initialized', {
  logLevel: getLogLevel(),
  logDir: LOG_DIR,
  transports: logger.transports.map((t) => t.constructor.name),
});

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = logger;
