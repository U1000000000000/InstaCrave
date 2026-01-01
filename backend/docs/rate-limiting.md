# Rate Limiting Strategy

## Overview
This backend uses advanced, industry-grade rate limiting to protect APIs from abuse and ensure fair usage. Rate limiting is enforced using Redis-backed stores and express-rate-limit middleware.

## Limiters
- **Global Limiter:** Applied to public endpoints (`/api/v1/auth`, `/api/v1/search`). Limits requests per IP.
- **User Limiter:** Applied to authenticated endpoints (`/api/v1/user`, `/api/v1/food-partner`, `/api/v1/orders`, `/api/v1/food`, `/api/v2/food`). Limits requests per user, with dynamic limits based on role.
- **Login & Refresh Limiters:** Special limiters for login and refresh endpoints to prevent brute-force attacks.

## Dynamic Limits
- **Food Partners:** Higher limits (e.g., 5000/hr).
- **Regular Users:** Default limits (e.g., 2000/hr).
- Limits are set dynamically based on `req.user.role`.

## Headers
All rate-limited responses include standard headers:
- `X-RateLimit-Limit`: Maximum requests allowed.
- `X-RateLimit-Remaining`: Requests left in the current window.
- `X-RateLimit-Reset`: Time when the window resets.

## Error Handling
- If a client exceeds the limit, a `429 Too Many Requests` response is returned with a descriptive message.
- Structured logging is performed for all rate limit hits.

## Redis Dependency
- All limiters use Redis for distributed, scalable tracking.
- Ensure Redis is monitored and highly available.

## Tuning & Maintenance
- Limits can be adjusted in `rateLimiter.middleware.js`.
- To add new limiters, follow the pattern in the middleware and apply to desired routes in `app.js`.
- Monitor logs and metrics for abuse patterns and tune as needed.

## Troubleshooting
- If Redis is down, public endpoints fail open, but authenticated endpoints fail closed for security.
- Check logs for `[RateLimit]` entries to audit rate limit events.

## References
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit)
- [rate-limit-redis](https://github.com/wyattjoh/rate-limit-redis)

---
For questions or changes, contact backend maintainers.
