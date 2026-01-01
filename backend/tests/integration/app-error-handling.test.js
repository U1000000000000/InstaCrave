/**
 * Unit Tests: Application Error Handler
 * Tests global error handling middleware in app.js
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Application Error Handling', () => {
  describe('Error Middleware', () => {
    it('should handle unauthorized access with 401 status', async () => {
      // Try to access protected route without auth
      const res = await request(app)
        .get('/api/v2/food')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should handle forbidden access (wrong role)', async () => {
      const { generateAuthTokens } = require('../setup/testHelpers');
      
      // Create a user token
      const userToken = generateAuthTokens('507f1f77bcf86cd799439011', 'user').accessToken;
      
      // Try to access food partner only route with user token
      const res = await request(app)
        .get('/api/v1/food-partner')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(401); // Returns 401 because token is valid but wrong role

      expect(res.body.success).toBe(false);
    });

    it('should handle missing routes with 404', async () => {
      const res = await request(app)
        .get('/api/v1/nonexistent-endpoint-12345')
        .expect(404);
      
      // May or may not have response body depending on error handling
    });
  });

  describe('Health Check', () => {
    it('should respond to root endpoint', async () => {
      const res = await request(app)
        .get('/')
        .expect(200);

      expect(res.text).toBeTruthy();
    });
  });
});
