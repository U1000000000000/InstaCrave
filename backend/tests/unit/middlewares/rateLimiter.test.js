// Simple functional tests for rate limiter middleware
// Since rate limiting is provided by express-rate-limit library,
// we focus on testing our configuration and exports

const rateLimiterModule = require('../../../src/middlewares/rateLimiter.middleware');

describe('Rate Limiter Middleware', () => {
  // FIXME: These are shallow tests - not actually testing rate limiting behavior
  // Integration test in rateLimiter.integration.test.js is more comprehensive but occasionally flaky
  describe('Exported limiters', () => {
    it('should export globalLimiter', () => {
      expect(rateLimiterModule.globalLimiter).toBeDefined();
      expect(typeof rateLimiterModule.globalLimiter).toBe('function');
    });

    it('should export loginLimiter', () => {
      expect(rateLimiterModule.loginLimiter).toBeDefined();
      expect(typeof rateLimiterModule.loginLimiter).toBe('function');
    });

    it('should export refreshLimiter', () => {
      expect(rateLimiterModule.refreshLimiter).toBeDefined();
      expect(typeof rateLimiterModule.refreshLimiter).toBe('function');
    });

    it('should export userLimiter factory function', () => {
      expect(typeof rateLimiterModule.userLimiter).toBe('function');
    });

    it('should export redisClient (null in test env)', () => {
      expect(rateLimiterModule.redisClient).toBeNull();
    });
  });

  describe('userLimiter factory', () => {
    it('should create a limiter function', () => {
      const limiter = rateLimiterModule.userLimiter({ max: 100 });
      expect(typeof limiter).toBe('function');
    });

    it('should create different limiters with different options', () => {
      const limiter1 = rateLimiterModule.userLimiter({ max: 100 });
      const limiter2 = rateLimiterModule.userLimiter({ max: 200 });
      
      expect(limiter1).toBeDefined();
      expect(limiter2).toBeDefined();
      // They should be different function instances
      expect(limiter1).not.toBe(limiter2);
    });

    it('should work without options', () => {
      const limiter = rateLimiterModule.userLimiter();
      expect(typeof limiter).toBe('function');
    });
  });

  describe('Middleware behavior', () => {
    it('should have callable middleware functions', () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      // Each limiter should be callable as middleware without throwing
      expect(() => {
        rateLimiterModule.globalLimiter(mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(() => {
        rateLimiterModule.loginLimiter(mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(() => {
        rateLimiterModule.refreshLimiter(mockReq, mockRes, mockNext);
      }).not.toThrow();
    });
  });
});

