/**
 * Cache Service
 *
 * Provides a stable interface for caching across the codebase and tests.
 *
 * NOTE:
 * - In production/dev, this wraps RedisService (redis.service.js)
 * - In tests, RedisService transparently falls back to an in-memory implementation
 */

const { cache } = require('./redis.service');

async function get(key) {
  return cache.get(key);
}

async function set(key, value, ttlSeconds = 300) {
  return cache.set(key, value, ttlSeconds);
}

async function del(keys) {
  return cache.del(keys);
}

async function delPattern(pattern) {
  return cache.delPattern(pattern);
}

async function flushAll() {
  // Keep name stable for tests (flushAll) while using production implementation.
  return cache.invalidateAll();
}

// FIXME: getMetrics() returns in-memory stats in tests but real Redis metrics in prod
// This inconsistency makes it hard to write reliable metric tests
function getMetrics() {
  return cache.getMetrics();
}

module.exports = {
  get,
  set,
  del,
  delPattern,
  flushAll,
  getMetrics,
};
