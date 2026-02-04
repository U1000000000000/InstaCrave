/**
 * Integration Tests: Authentication Flows
 * End-to-end tests for user and food partner authentication
 */

const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/models/user.model');
const foodPartnerModel = require('../../src/models/foodpartner.model');
const Session = require('../../src/models/session.model');
// Test helpers loaded globally via jest setupFilesAfterEnv

describe('Authentication Integration Tests', () => {
  
  describe('User Registration', () => {
    
    it('should register new user with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'John Doe',
          email: 'john.doe@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.fullName).toBe('John Doe');
      expect(res.body.data.email).toBe('john.doe@example.com');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should set access and refresh tokens in cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          password: 'password123'
        });

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const accessTokenCookie = cookies.find(c => c.startsWith('accessToken='));
      const refreshTokenCookie = cookies.find(c => c.startsWith('refreshToken='));
      const sessionIdCookie = cookies.find(c => c.startsWith('sessionId='));

      expect(accessTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();
      expect(sessionIdCookie).toBeDefined();
    });

    it('should create session in database', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'Session User',
          email: 'session@example.com',
          password: 'password123'
        });

      const userId = res.body.data._id;
      const sessions = await Session.find({ userId, userType: 'User' });
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0].userAgent).toBeDefined();
      expect(sessions[0].tokenHash).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const res = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'Duplicate User',
          email: 'duplicate@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'Test User',
          email: 'invalid-email',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require minimum password length', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: '12345'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should sanitize XSS in fullName', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: '<script>alert("XSS")</script>John Doe',
          email: 'xss@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).not.toContain('<script>');
    });
  });

  describe('User Login', () => {
    
    it('should login with valid credentials', async () => {
      await createTestUser({
        email: 'login@example.com',
        password: 'password123'
      });

      const res = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.email).toBe('login@example.com');
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      await createTestUser({
        email: 'user@example.com',
        password: 'correctpassword'
      });

      const res = await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'user@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should create new session on login', async () => {
      const user = await createTestUser({
        email: 'session.test@example.com',
        password: 'password123'
      });

      await request(app)
        .post('/api/v1/auth/user/login')
        .send({
          email: 'session.test@example.com',
          password: 'password123'
        });

      const sessions = await Session.find({ userId: user._id });
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  describe('User Logout', () => {
    
    it('should logout successfully', async () => {
      const user = await createTestUser();
      const { accessToken } = generateAuthTokens(user._id, 'user');

      const res = await request(app)
        .post('/api/v1/auth/user/logout')
        .set('Cookie', `accessToken=${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('logged out');
    });

    it('should clear cookies on logout', async () => {
      const user = await createTestUser();
      const { accessToken } = generateAuthTokens(user._id, 'user');

      const res = await request(app)
        .post('/api/v1/auth/user/logout')
        .set('Cookie', `accessToken=${accessToken}`);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });
  });

  describe('Food Partner Registration', () => {
    
    it('should register food partner with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/food-partner/register')
        .field('name', 'Pizza Palace')
        .field('email', 'pizza@example.com')
        .field('password', 'password123')
        .field('phone', '1234567890')
        .field('address', '123 Main Street')
        .field('contactName', 'John Manager');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.name).toBe('Pizza Palace');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should set authentication cookies', async () => {
      const res = await request(app)
        .post('/api/v1/auth/food-partner/register')
        .field('name', 'Restaurant')
        .field('email', 'rest@example.com')
        .field('password', 'password123')
        .field('phone', '1234567890')
        .field('address', '123 St')
        .field('contactName', 'Manager');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.startsWith('accessToken='))).toBe(true);
    });

    it('should reject duplicate email', async () => {
      await createTestFoodPartner({ email: 'unique@example.com' });

      const res = await request(app)
        .post('/api/v1/auth/food-partner/register')
        .field('name', 'Restaurant')
        .field('email', 'unique@example.com')
        .field('password', 'password123')
        .field('phone', '1234567890')
        .field('address', '123 St')
        .field('contactName', 'Manager');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('Food Partner Login', () => {
    
    it('should login food partner with valid credentials', async () => {
      await createTestFoodPartner({
        email: 'partner@example.com',
        password: 'password123'
      });

      const res = await request(app)
        .post('/api/v1/auth/food-partner/login')
        .send({
          email: 'partner@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('partner@example.com');
    });

    it('should reject invalid credentials', async () => {
      await createTestFoodPartner({
        email: 'partner@example.com',
        password: 'correctpass'
      });

      const res = await request(app)
        .post('/api/v1/auth/food-partner/login')
        .send({
          email: 'partner@example.com',
          password: 'wrongpass'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Token Refresh Flow', () => {
    
    it('should refresh access token with valid refresh token', async () => {
      // Register user to get tokens
      const registerRes = await request(app)
        .post('/api/v1/auth/user/register')
        .send({
          fullName: 'Refresh Test',
          email: 'refresh@example.com',
          password: 'password123'
        });

      const cookies = registerRes.headers['set-cookie'];
      
      // Extract tokens
      const refreshToken = extractCookie(registerRes, 'refreshToken');
      const sessionId = extractCookie(registerRes, 'sessionId');

      // Refresh tokens
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [refreshToken, sessionId]);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.message).toContain('refreshed');
      
      const newCookies = refreshRes.headers['set-cookie'];
      expect(newCookies.some(c => c.startsWith('accessToken='))).toBe(true);
    });

    it('should reject refresh without refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid session ID', async () => {
      const refreshToken = 'fake-refresh-token';
      const sessionId = 'sessionId=invalid-id';

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [refreshToken, sessionId]);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Get Current User', () => {
    
    it('should return current authenticated user', async () => {
      const user = await createTestUser();
      const { accessToken } = generateAuthTokens(user._id, 'user');

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `accessToken=${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('user');
      expect(res.body.data.id).toBe(user._id.toString());
    });

    it('should return current authenticated food partner', async () => {
      const partner = await createTestFoodPartner();
      const { accessToken } = generateAuthTokens(partner._id, 'foodPartner');

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `accessToken=${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('food-partner');
      expect(res.body.data.id).toBe(partner._id.toString());
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });
  });

  describe('Session Management', () => {
    
    it('should list active sessions', async () => {
      const user = await createTestUser();
      const { accessToken, refreshToken } = generateAuthTokens(user._id, 'user');
      await createTestSession(user._id, 'User', refreshToken);

      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Cookie', `accessToken=${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should revoke session by ID', async () => {
      const user = await createTestUser();
      const { accessToken, refreshToken } = generateAuthTokens(user._id, 'user');
      const session = await createTestSession(user._id, 'User', refreshToken);

      const res = await request(app)
        .delete(`/api/v1/auth/sessions/${session._id}`)
        .set('Cookie', `accessToken=${accessToken}`);

      expect(res.status).toBe(200);
      
      const deletedSession = await Session.findById(session._id);
      expect(deletedSession).toBeNull();
    });
  });
});
