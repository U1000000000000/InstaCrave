// backend/src/middlewares/cache.middleware.js
const { cache } = require('../services/redis.service');
const crypto = require('crypto');
const logger = require('../services/logger.service');

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Function to generate cache key from req
 * @param {Object} options - Additional options
 * @param {Function} options.shouldCache - Optional function to determine if response should be cached
 * @param {number} options.maxKeyLength - Maximum cache key length before hashing (default: 200)
 */
function cacheMiddleware(ttl = 300, keyGenerator = null, options = {}) {
  const { shouldCache = null, maxKeyLength = 200 } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    let cacheKey;
    try {
      cacheKey = keyGenerator
        ? keyGenerator(req)
        : generateDefaultCacheKey(req);
      
      // Hash if key is too long
      if (cacheKey.length > maxKeyLength) {
        const hash = crypto.createHash('sha256').update(cacheKey).digest('hex').substring(0, 16);
        const prefix = cacheKey.substring(0, maxKeyLength - 60);
        cacheKey = `${prefix}:${hash}`;
      }
    } catch (keyError) {
      // If key generation fails, skip caching
      logger.error('Cache key generation error', {
        error: keyError.message,
        url: req.originalUrl,
      });
      return next();
    }

    // Try to get from cache
    try {
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        // TODO: Add cache warming for popular endpoints
        // Tried using BullMQ scheduled job but caused stampede when warming 50+ keys at once
        res.set('X-Cache', 'HIT');
        return res.status(200).json(cachedData);
      }
    } catch (error) {
      // Cache read failure - continue without cache
      logger.error('Cache read error', {
        error: error.message,
        cacheKey,
      });
    }

    // Cache miss - intercept response
    res.set('X-Cache', 'MISS');
    
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    let responseSent = false;

    // Override res.json
    res.json = function(data) {
      if (!responseSent) {
        responseSent = true;
        
        // Only cache successful responses
        const statusCode = res.statusCode || 200;
        if (statusCode === 200) {
          // Optional custom shouldCache logic
          if (!shouldCache || shouldCache(req, res, data)) {
            cache.set(cacheKey, data, ttl).catch(err => {
              logger.cache('set-failed', cacheKey, {
                error: err.message,
              });
            });
          }
        }
      }
      return originalJson(data);
    };

    // Also handle res.send for compatibility
    res.send = function(data) {
      if (!responseSent && res.statusCode === 200) {
        responseSent = true;
        
        // Try to parse and cache if it's JSON
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          if (!shouldCache || shouldCache(req, res, parsed)) {
            cache.set(cacheKey, parsed, ttl).catch(err => {
              logger.cache('set-failed', cacheKey, {
                error: err.message,
              });
            });
          }
        } catch (parseError) {
          // Not JSON, skip caching
        }
      }
      return originalSend(data);
    };

    next();
  };
}

/**
 * Generate default cache key from request
 */
function generateDefaultCacheKey(req) {
  const queryString = JSON.stringify(req.query || {});
  return `${req.path}:${queryString}`;
}

/**
 * Generate user-scoped cache key
 */
function userCacheKey(req) {
  const userId = req.user?.id || req.user?._id || 'anon';
  const queryString = JSON.stringify(req.query || {});
  return `user:${userId}:${req.path}:${queryString}`;
}

/**
 * Generate food partner-scoped cache key
 */
function partnerCacheKey(req) {
  const partnerId = req.user?.id || req.user?._id || 'anon';
  const queryString = JSON.stringify(req.query || {});
  return `partner:${partnerId}:${req.path}:${queryString}`;
}

/**
 * Generate public (non-user-specific) cache key
 */
function publicCacheKey(req) {
  const queryString = JSON.stringify(req.query || {});
  return `public:${req.path}:${queryString}`;
}

/**
 * Cache invalidation middleware
 * Use on POST/PUT/PATCH/DELETE routes to invalidate related caches
 */
function invalidateCache(...patterns) {
  return async (req, res, next) => {
    // Store original json to intercept response
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const pattern of patterns) {
          try {
            // Pattern can be a string or a function that returns pattern(s)
            if (typeof pattern === 'function') {
              const result = pattern(req, res, data);
              if (Array.isArray(result)) {
                for (const p of result) {
                  await cache.delPattern(p);
                }
              } else if (result) {
                await cache.delPattern(result);
              }
            } else {
              await cache.delPattern(pattern);
            }
          } catch (error) {
            logger.error('Cache invalidation error', {
              error: error.message,
              pattern: typeof pattern === 'function' ? 'dynamic' : pattern,
            });
          }
        }
      }
      return originalJson(data);
    };
    
    next();
  };
}

module.exports = {
  cacheMiddleware,
  userCacheKey,
  partnerCacheKey,
  publicCacheKey,
  invalidateCache,
};
