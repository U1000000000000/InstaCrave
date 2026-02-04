# Redis Cache (Quick Reference)

This backend has a small cache-aside layer:

- Cache client: `src/services/redis.service.js`
- Route middleware: `src/middlewares/cache.middleware.js`

## Configure

Set (at minimum):

```bash
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
APP_CACHE_VERSION=v1
```

## Use on GET routes

```js
const {
  cacheMiddleware,
  publicCacheKey,
  userCacheKey,
  partnerCacheKey,
} = require('../middlewares/cache.middleware');

router.get('/api/v1/food', cacheMiddleware(300, publicCacheKey), listFood);
router.get('/api/v1/user/profile', auth, cacheMiddleware(300, userCacheKey), me);
router.get('/api/v1/food-partner', auth, cacheMiddleware(300, partnerCacheKey), partnerMe);
```

Notes:

- Only caches `GET`.
- Adds `X-Cache: HIT|MISS` header.
- Only caches successful (`200`) JSON responses.

## Invalidate on writes

```js
const { invalidateCache } = require('../middlewares/cache.middleware');

router.post('/api/v1/food', auth, invalidateCache('public:/api/v1/food:*'), createFood);

router.patch(
  '/api/v1/food/:id',
  auth,
  invalidateCache(
    (req) => `public:/api/v1/food:*`,
    (req) => `public:/api/v1/food/${req.params.id}:*`
  ),
  updateFood
);
```

Rule of thumb: invalidate list keys + any detail key you affected.

## Metrics (optional)

The Redis service keeps in-process counters you can use while debugging:

```js
const { cache } = require('../services/redis.service');

console.log(cache.getMetrics());
cache.resetMetrics();
```

There are no admin HTTP endpoints for cache metrics.

## File locations

- `backend/src/services/redis.service.js`
- `backend/src/middlewares/cache.middleware.js`
