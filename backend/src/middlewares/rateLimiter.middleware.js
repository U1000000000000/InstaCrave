// Advanced rate limiter middleware using express-rate-limit and Redis
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { ipKeyGenerator } = require('express-rate-limit');
const Redis = require('ioredis');

// Create a Redis client with retry/backoff (skip in test environment)
let redisClient = null;
if (process.env.NODE_ENV !== 'test') {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    username: 'default', 
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    enableOfflineQueue: true,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
}

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

    console.warn('[RateLimit][GLOBAL]', {
      route: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || null
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

// Login limiter (per IP)
const loginLimiterOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false, // Fail closed for auth endpoints
  keyGenerator: ipKeyGenerator,
  handler: (req, res) => {
    console.warn('[RateLimit][LOGIN]', {
      route: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || null
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
    console.warn('[RateLimit][REFRESH]', {
      route: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || null
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
      console.warn('[RateLimit][USER]', {
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

module.exports = {
  globalLimiter,
  loginLimiter,
  refreshLimiter,
  userLimiter,
  redisClient,
};