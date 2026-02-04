// backend/src/services/redis.service.js
const Redis = require('ioredis');
const crypto = require('crypto');
const logger = require('./logger.service');
const { EventEmitter } = require('events');

// TODO: Add exponential backoff for Redis connection retries
// Currently just fails fast which isn't great for production
class InMemoryRedisClient extends EventEmitter {
  constructor() {
    super();
    this._store = new Map();
    // Simulate immediate connect
    process.nextTick(() => this.emit('connect'));
  }

  _isExpired(entry) {
    return entry && entry.expiresAt && entry.expiresAt <= Date.now();
  }

  _getEntry(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (this._isExpired(entry)) {
      this._store.delete(key);
      return null;
    }
    return entry;
  }

  _getOrCreateZSet(key) {
    const entry = this._getEntry(key);
    if (entry && entry.type === 'zset' && entry.value instanceof Map) {
      return entry;
    }

    const expiresAt = entry?.expiresAt ?? null;
    const newEntry = { type: 'zset', value: new Map(), expiresAt };
    this._store.set(key, newEntry);
    return newEntry;
  }

  async get(key) {
    const entry = this._getEntry(key);
    if (!entry) return null;
    if (entry.type === 'zset') return null;
    return entry.value;
  }

  async setex(key, ttlSeconds, value) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this._store.set(key, { value: String(value), expiresAt });
    return 'OK';
  }

  async expire(key, ttlSeconds) {
    const entry = this._getEntry(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    this._store.set(key, entry);
    return 1;
  }

  async incrby(key, increment) {
    const currentRaw = await this.get(key);
    const current = currentRaw === null ? 0 : Number(currentRaw);
    const next = (Number.isFinite(current) ? current : 0) + Number(increment);

    const existingEntry = this._getEntry(key);
    const expiresAt = existingEntry?.expiresAt ?? null;
    this._store.set(key, { value: String(next), expiresAt });
    return next;
  }

  async zadd(key, score, member) {
    const entry = this._getOrCreateZSet(key);
    entry.value.set(String(member), Number(score));
    this._store.set(key, entry);
    return 1;
  }

  async zincrby(key, increment, member) {
    const entry = this._getOrCreateZSet(key);
    const current = entry.value.get(String(member)) ?? 0;
    const next = Number(current) + Number(increment);
    entry.value.set(String(member), next);
    this._store.set(key, entry);
    return String(next);
  }

  async zcard(key) {
    const entry = this._getEntry(key);
    if (!entry || entry.type !== 'zset' || !(entry.value instanceof Map)) return 0;
    return entry.value.size;
  }

  async zrevrange(key, start, stop, withScores) {
    const entry = this._getEntry(key);
    if (!entry || entry.type !== 'zset' || !(entry.value instanceof Map)) return [];

    const tuples = Array.from(entry.value.entries()).map(([member, score]) => ({ member, score }));
    tuples.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.member.localeCompare(b.member);
    });

    const s = Number(start);
    let e = Number(stop);
    if (e < 0) e = tuples.length + e;
    const slice = tuples.slice(s, e + 1);

    const wantsScores = String(withScores || '').toUpperCase() === 'WITHSCORES';
    if (!wantsScores) return slice.map(t => t.member);

    const result = [];
    for (const t of slice) {
      result.push(t.member, String(t.score));
    }
    return result;
  }

  async del(...keys) {
    let deleted = 0;
    for (const key of keys) {
      if (this._store.delete(key)) deleted++;
    }
    return deleted;
  }

  async exists(key) {
    const value = await this.get(key);
    return value === null ? 0 : 1;
  }

  async set(key, value, ...args) {
    // Supports subset used by getOrSet: SET key value PX <ms> NX
    let pxMs = null;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      const token = args[i];
      if (token === 'PX') {
        pxMs = Number(args[i + 1]);
        i++;
      } else if (token === 'NX') {
        nx = true;
      }
    }

    if (nx) {
      const existing = await this.get(key);
      if (existing !== null) return null;
    }

    const expiresAt = pxMs ? Date.now() + pxMs : null;
    this._store.set(key, { value: String(value), expiresAt });
    return 'OK';
  }

  async scan(_cursor, ...args) {
    // Very small implementation: supports SCAN cursor MATCH pattern COUNT n
    let pattern = '*';
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'MATCH') {
        pattern = String(args[i + 1] || '*');
        i++;
      }
    }

    const regex = new RegExp('^' + pattern.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
    const keys = [];
    for (const key of this._store.keys()) {
      const entry = this._store.get(key);
      if (this._isExpired(entry)) {
        this._store.delete(key);
        continue;
      }
      if (regex.test(key)) keys.push(key);
    }

    // No cursor pagination needed for test
    return ['0', keys];
  }

  async flushdb() {
    this._store.clear();
    return 'OK';
  }

  // Used by rate-limit-redis store (only in non-test), but keep for completeness
  async call(command, ...args) {
    const cmd = String(command).toLowerCase();
    if (cmd === 'get') return this.get(args[0]);
    if (cmd === 'set') return this.set(args[0], args[1], ...args.slice(2));
    if (cmd === 'del') return this.del(...args);
    if (cmd === 'exists') return this.exists(args[0]);
    if (cmd === 'scan') return this.scan(args[0], ...args.slice(1));
    if (cmd === 'expire') return this.expire(args[0], args[1]);
    if (cmd === 'incrby') return this.incrby(args[0], args[1]);
    if (cmd === 'zadd') return this.zadd(args[0], args[1], args[2]);
    if (cmd === 'zincrby') return this.zincrby(args[0], args[1], args[2]);
    if (cmd === 'zcard') return this.zcard(args[0]);
    if (cmd === 'zrevrange') return this.zrevrange(args[0], args[1], args[2], args[3]);
    if (cmd === 'flushdb') return this.flushdb();
    throw new Error(`InMemoryRedisClient: unsupported command ${command}`);
  }
}

class RedisService {
  constructor() {
    this.client = process.env.NODE_ENV === 'test'
      ? new InMemoryRedisClient()
      : new Redis(process.env.REDIS_URL || {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
      // Production configs
      connectTimeout: 10000,
      lazyConnect: false,
      keepAlive: 30000,
      ...(process.env.REDIS_TLS === 'true' && {
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      })
    });

    this.cacheVersion = process.env.APP_CACHE_VERSION || 'v1';
    
    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      stampedePrevented: 0,
      errors: 0,
    };

    // In-flight request tracking for stampede protection
    this.pendingRequests = new Map();

    this.client.on('connect', () => {
      if (process.env.NODE_ENV !== 'test') {
        logger.info('✅ Redis connected successfully');
      }
    });
    this.client.on('error', (err) => {
      if (process.env.NODE_ENV !== 'test') {
        logger.error('❌ Redis connection error:', err);
      }
      this.metrics.errors++;
    });
  }

  /**
   * Generate versioned cache key with optional hashing for long keys
   */
  generateKey(key, maxLength = 200) {
    const versionedKey = `${this.cacheVersion}:${key}`;
    
    if (versionedKey.length > maxLength) {
      const hash = crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
      const prefix = key.substring(0, maxLength - 60);
      return `${this.cacheVersion}:${prefix}:${hash}`;
    }
    
    return versionedKey;
  }

  /**
   * Get value from cache with validation
   */
  async get(key) {
    try {
      const versionedKey = this.generateKey(key);
      const data = await this.client.get(versionedKey);
      
      if (!data) {
        this.metrics.misses++;
        return null;
      }

      try {
        const parsed = JSON.parse(data);
        this.metrics.hits++;
        return parsed;
      } catch (parseError) {
        logger.error(`Invalid JSON in cache key ${versionedKey}, evicting:`, parseError);
        await this.del(key); // Auto-evict corrupted data
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      this.metrics.errors++;
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    try {
      const versionedKey = this.generateKey(key);
      await this.client.setex(versionedKey, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      this.metrics.errors++;
    }
  }

  async del(keys) {
    try {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      const versionedKeys = keysArray.map(k => this.generateKey(k));
      
      if (versionedKeys.length > 0) {
        await this.client.del(...versionedKeys);
      }
    } catch (error) {
      logger.error(`Redis DEL error for keys ${keys}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Delete keys by pattern using SCAN (safe for production)
   * Instead of KEYS which blocks Redis, uses SCAN for incremental iteration
   */
  async delPattern(pattern) {
    try {
      const versionedPattern = `${this.cacheVersion}:${pattern}`;
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [newCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          versionedPattern,
          'COUNT',
          100
        );
        cursor = newCursor;

        if (keys.length > 0) {
          await this.client.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      if (deletedCount > 0) {
        logger.info(`Deleted ${deletedCount} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Redis DEL pattern error for ${pattern}:`, error);
      this.metrics.errors++;
    }
  }

  async exists(key) {
    try {
      const versionedKey = this.generateKey(key);
      return (await this.client.exists(versionedKey)) === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Atomic increment helper (used by analytics real-time metrics)
   */
  async incr(key, incrementBy = 1, ttlSeconds = null) {
    try {
      const versionedKey = this.generateKey(key);
      const next = await this.client.incrby(versionedKey, Number(incrementBy));
      if (ttlSeconds && Number(ttlSeconds) > 0 && typeof this.client.expire === 'function') {
        await this.client.expire(versionedKey, Number(ttlSeconds));
      }
      return next;
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Get or Set with cache stampede protection
   * Uses distributed lock to prevent thundering herd
   */
  async getOrSet(key, fetchFn, ttl = 300) {
    // Try cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Check if another request is already fetching this key
    const lockKey = `lock:${key}`;
    const versionedLockKey = this.generateKey(lockKey);
    const requestId = crypto.randomBytes(8).toString('hex');
    
    // Try to acquire lock (SET NX PX)
    const lockAcquired = await this.client.set(
      versionedLockKey,
      requestId,
      'PX',
      5000, // 5 second lock timeout
      'NX'
    );

    if (lockAcquired) {
      // This request won the race - fetch the data
      try {
        const data = await fetchFn();
        await this.set(key, data, ttl);
        return data;
      } finally {
        // Release lock
        const lockValue = await this.client.get(versionedLockKey);
        if (lockValue === requestId) {
          await this.client.del(versionedLockKey);
        }
      }
    } else {
      // Another request is fetching - wait and retry
      this.metrics.stampedePrevented++;
      
      // Wait briefly and retry getting from cache
      await new Promise(resolve => setTimeout(resolve, 100));
      
      for (let i = 0; i < 20; i++) {
        const retryData = await this.get(key);
        if (retryData !== null) {
          return retryData;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Fallback: fetch anyway if lock holder failed
      const data = await fetchFn();
      await this.set(key, data, ttl);
      return data;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? (this.metrics.hits / total * 100).toFixed(2) + '%' : '0%',
      total,
    };
  }

  /**
   * Reset metrics (useful for monitoring intervals)
   */
  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      stampedePrevented: 0,
      errors: 0,
    };
  }

  /**
   * ========================================
   * CACHE INVALIDATION HELPERS
   * ========================================
   */

  /**
   * Invalidate all cache for a specific user
   * Use when user data changes (profile, follow, etc.)
   */
  async invalidateUser(userId) {
    await this.delPattern(`user:${userId}:*`);
  }

  /**
   * Invalidate all cache for a specific food partner
   * Use when partner data changes (profile, food posts, etc.)
   */
  async invalidateFoodPartner(partnerId) {
    await this.delPattern(`partner:${partnerId}:*`);
  }

  /**
   * Invalidate all cache for a specific food item
   * Use when food is updated/deleted or interactions change (likes, saves, comments)
   */
  async invalidateFood(foodId) {
    await this.delPattern(`food:${foodId}:*`);
  }

  /**
   * Invalidate food list caches
   * Use when new food is created
   */
  async invalidateFoodLists() {
    await this.delPattern(`*:/api/v1/food:*`);
    await this.delPattern(`*:/api/v1/food/*`);
  }

  /**
   * Invalidate search caches
   * Use when search index changes
   */
  async invalidateSearch() {
    await this.delPattern(`*:/api/v1/search:*`);
  }

  /**
   * Invalidate all caches (nuclear option)
   * Use for cache version bump or critical data changes
   */
  async invalidateAll() {
    await this.client.flushdb();
    if (process.env.NODE_ENV !== 'test') {
      logger.warn('⚠️  All cache has been invalidated');
    }
  }
}

module.exports = { cache: new RedisService() };
