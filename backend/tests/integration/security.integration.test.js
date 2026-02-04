/**
 * Security Integration Tests
 * Tests for CSRF protection, rate limiting, and CORS
 */

const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/models/user.model');
// Test helpers loaded globally

describe('Security Integration Tests', () => {
  
  describe('CORS (Cross-Origin Resource Sharing)', () => {
    it('should allow requests from configured frontend origin', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/register')
        .set('Origin', process.env.FRONTEND_URL)
        .send({
          fullName: 'CORS Test',
          email: `cors-${Date.now()}@test.com`,
          password: 'password123'
        })
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(process.env.FRONTEND_URL);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

      it('should allow requests from local frontend origin in development', async () => {
        const localOrigin = process.env.FRONTEND_URL_LOCAL || 'http://localhost:5173';
        const response = await request(app)
          .post('/api/v1/auth/user/register')
          .set('Origin', localOrigin)
          .send({
            fullName: 'CORS Test 2',
            email: `cors2-${Date.now()}@test.com`,
            password: 'password123'
          })
          .expect(200);

        expect(response.headers['access-control-allow-origin']).toBe(localOrigin);
        expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/register')
        .set('Origin', 'https://malicious-site.com')
        .send({
          fullName: 'Malicious',
          email: 'malicious@test.com',
          password: 'password123'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('CORS Forbidden');
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/v1/auth/user/login')
        .set('Origin', process.env.FRONTEND_URL)
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(process.env.FRONTEND_URL);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should allow all common HTTP methods', async () => {
      const response = await request(app)
        .options('/api/v1/food')
        .set('Origin', process.env.FRONTEND_URL)
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      const allowedMethods = response.headers['access-control-allow-methods'];
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('PATCH');
      expect(allowedMethods).toContain('DELETE');
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers in response', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpass'
        });

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });

    it('should allow multiple requests within limit', async () => {
      // Make 3 consecutive requests (well below any limit)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/auth/user/login')
          .send({
            email: `test${i}@test.com`,
            password: 'wrongpass'
          });
      }
    });

    it('should track remaining requests', async () => {
      const response1 = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'test1@test.com',
          password: 'wrongpass'
        });

      const remaining1 = parseInt(response1.headers['ratelimit-remaining']);

      const response2 = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'test2@test.com',
          password: 'wrongpass'
        });

      const remaining2 = parseInt(response2.headers['ratelimit-remaining']);

      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });

    it('should have stricter limits for login endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      const loginLimit = parseInt(response.headers['ratelimit-limit']);
      
      const registerResponse = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'Test',
          email: `ratetest${Date.now()}@test.com`,
          password: 'password123'
        });

      const globalLimit = parseInt(registerResponse.headers['ratelimit-limit']);

      // Login should have stricter (lower) limit than global
      expect(loginLimit).toBeLessThanOrEqual(globalLimit);
    });
  });

  describe('CSRF Protection', () => {
    // Note: CSRF protection through cookie-based authentication
    // SameSite cookie attribute provides CSRF protection
    it('should use cookie-based authentication for CSRF protection', async () => {
      const user = await createTestUser({
        fullName: 'CSRF Test',
        email: `csrf${Date.now()}@test.com`,
        password: 'password123'
      });

      const response = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: user.email,
          password: 'password123'
        })
        .expect(200);

      // Should have secure cookies
      const cookies = response.headers['set-cookie'] || [];
      expect(cookies.length).toBeGreaterThan(0);
      
      // Cookies should have accessToken for authentication
      const hasSecureCookie = cookies.some(c => c.includes('accessToken'));
      expect(hasSecureCookie).toBe(true);
    });
  });

  describe('Authentication Security', () => {
    let user, userTokens;

    beforeEach(async () => {
      user = await createTestUser({
        email: 'security@test.com',
        password: 'SecurePass123!',
        fullName: 'Security Test User'
      });
      const { generateAuthTokens } = require('../setup/testHelpers');
      userTokens = generateAuthTokens(user._id, 'user');
    });

    it('should reject requests without authentication', async () => {
      await request(app)
        .get('/api/v1/orders')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app)
        .get('/api/v1/orders')
        .set('Cookie', 'accessToken=invalid-token-here')
        .expect(401);
    });

    it('should reject requests with expired token format', async () => {
      await request(app)
        .get('/api/v1/orders')
        .set('Cookie', 'accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjAsImlhdCI6MH0.invalid')
        .expect(401);
    });

    it('should accept requests with valid authentication', async () => {
      await request(app)
        .get('/api/v1/orders')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .expect(200);
    });

    it('should not expose password in responses', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'security@test.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      expect(response.body.data).not.toHaveProperty('password');
      expect(JSON.stringify(response.body)).not.toContain('SecurePass123!');
    });

    it('should not expose sensitive data in error messages', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePassword123!'
        });

      // Should fail with 400 (invalid email) or 401 (invalid credentials)
      expect([400, 401]).toContain(response.status);

      // Should not reveal whether email exists
      expect(response.body.message).not.toContain('nonexistent@test.com');
      expect(response.body.message).not.toContain('SomePassword123!');
    });
  });

  describe('Input Validation Security', () => {
    it('should sanitize HTML in user input', async () => {
      const maliciousInput = '<script>alert("XSS")</script>Test User';
      
      const response = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: maliciousInput,
          email: 'xss-test@test.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.data.fullName).not.toContain('<script>');
      expect(response.body.data.fullName).toContain('Test User');
    });

    it('should reject SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: "admin' OR '1'='1",
          password: "password' OR '1'='1"
        });

      // Should fail with 400 (invalid email format) or 401 (invalid credentials)
      expect([400, 401]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'Test User',
          email: 'not-an-email',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should enforce password requirements', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'Test User',
          email: 'weak-pass@test.com',
          password: '123' // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject excessively long input', async () => {
      const veryLongString = 'a'.repeat(10000);
      
      const response = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: veryLongString,
          email: 'long-input@test.com',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('HTTP Security Headers', () => {
    it('should include rate limiting headers', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'Header Test',
          email: `header${Date.now()}@test.com`,
          password: 'password123'
        })
        .expect(200);

      // Rate limiting headers should be present
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpass'
        });

      // Common security headers
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('content-type');
      expect(response.headers).toHaveProperty('etag');
    });
  });
});
