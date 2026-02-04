// Rate limiter middleware using express-rate-limit and Redis
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { ipKeyGenerator } = require('express-rate-limit');
const { cache } = require('../services/redis.service');
const logger = require('../services/logger.service');

// Use the shared Redis client from redis.service.js
const redisClient = (process.env.NODE_ENV !== 'test') ? cache.client : null;

// Global API limiter (per IP)
const globalLimiterOptions = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 2000 : 10000, // Higher in dev/staging
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // Fail open for public APIs if Redis is down
  keyGenerator: ipKeyGenerator,
  handler: (req, res) => {
    // Structured logging for rate limit hits
    logger.security('Global rate limit exceeded', {
      route: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || null,
    });

    res.status(429).json({
      message: 'Too many requests from this IP, please try again later.'
    });
  },
};

// Only use Redis store in non-test environments
if (redisClient) {
  globalLimiterOptions.store = new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:global:',
  });
}

const globalLimiter = rateLimit(globalLimiterOptions);


// Login limiter (per IP, relaxed for localhost/test IPs in dev)
const loginLimiterOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req, res) => {
    // HACK: Bypassing rate limits for localhost in dev because kept hitting limits during testing
    // Should probably use a proper dev API key system instead
    const isLocal = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1';
    if (process.env.NODE_ENV !== 'production' && isLocal) {
      return 10000; // Effectively disables rate limit for local load testing
    }
    return 10;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false, // Fail closed for auth endpoints
  keyGenerator: ipKeyGenerator,
  handler: (req, res) => {
    logger.security('Login rate limit exceeded', {
      route: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || null,
    });

    res.status(429).json({
      message: 'Too many login attempts, please try again later.'
    });
  },
};

if (redisClient) {
  loginLimiterOptions.store = new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:login:',
  });
}

const loginLimiter = rateLimit(loginLimiterOptions);

// Refresh token limiter (user-based recommended)
const refreshLimiterOptions = {
  windowMs: 15 * 60 * 1000,
  max: 20, // Lowered for security
  keyGenerator: (req) => {
    if (!req.user?.id) return 'unauthenticated-refresh';
    return String(req.user.id);
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false, // Fail closed for auth endpoints
  handler: (req, res) => {
    logger.security('Refresh token rate limit exceeded', {
      route: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || null,
    });

    res.status(429).json({
      message: 'Too many refresh attempts, please try again later.'
    });
  },
};

if (redisClient) {
  refreshLimiterOptions.store = new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rl:refresh:',
  });
}

const refreshLimiter = rateLimit(refreshLimiterOptions);

// User-based limiter (for authenticated routes)
const userLimiter = (options = {}) => {
  const limiterOptions = {
    windowMs: options.windowMs || 60 * 60 * 1000,
    max: (req, res) => {
      // Dynamic limit based on user role
      if (req.user?.role === 'FOOD_PARTNER') {
        return 5000; // Higher limit for partners
      }
      return options.max || (process.env.NODE_ENV === 'production' ? 2000 : 10000);
    },
    keyGenerator: (req) => req.user?.id ? String(req.user.id) : ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false,
    handler: (req, res) => {
      logger.security('User action rate limit exceeded', {
        route: req.originalUrl,
        ip: req.ip,
        userId: req.user?.id || null,
        role: req.user?.role || 'UNKNOWN',
      });

      res.status(429).json({
        message: 'Too many requests, please try again later.'
      });
    },
  };

  if (redisClient) {
    limiterOptions.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rl:user:',
    });
  }

  return rateLimit(limiterOptions);
};

// Payment rate limiter (stricter for fraud prevention)
const paymentRateLimiterOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req, res) => {
    // Allow higher rate for localhost in non-production
    const isLocal = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1';
    if (process.env.NODE_ENV !== 'production' && isLocal) {
      return 10000;
    }
    return 20; // Stricter limit for payment endpoints
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false, // Fail closed for payment endpoints
  keyGenerator: (req) => {
    // User-based if authenticated, otherwise IP-based
    if (req.user?.id) return String(req.user.id);
    return ipKeyGenerator(req);
  },
  handler: (req, res) => {
    logger.security('Payment rate limit exceeded', {
      route: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || null,
    });

    res.status(429).json({
      success: false,
      message: 'Too many payment requests, please try again later.'
    });
  },
};

if (redisClient) {
  paymentRateLimiterOptions.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rl:payment:',
  });
}

const paymentRateLimiter = rateLimit(paymentRateLimiterOptions);

// Analytics rate limiter (allow high volume for event tracking)
const analyticsRateLimiterOptions = {
  windowMs: 60 * 1000, // 1 minute
  max: (req, res) => {
    // Allow very high rate for analytics (it's async processing)
    const isLocal = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1';
    if (process.env.NODE_ENV !== 'production' && isLocal) {
      return 10000;
    }
    // Allow 500 events per minute per user/IP
    return 500;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // Analytics failures shouldn't block users
  keyGenerator: (req) => {
    // User-based if authenticated, otherwise IP-based
    if (req.user?.id) return `analytics:${req.user.id}`;
    return `analytics:${ipKeyGenerator(req)}`;
  },
  handler: (req, res) => {
    logger.warn('Analytics rate limit exceeded', {
      route: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || null,
    });

    res.status(429).json({
      success: false,
      message: 'Too many analytics events, please slow down.'
    });
  },
};

if (redisClient) {
  analyticsRateLimiterOptions.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rl:analytics:',
});
}

const analyticsLimiter = rateLimit(analyticsRateLimiterOptions);

module.exports = {
  globalLimiter,
  loginLimiter,
  refreshLimiter,
  userLimiter,
  paymentRateLimiter,
  analyticsLimiter,
  redisClient,
};