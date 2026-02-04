/**
 * Integration Tests: User Controller
 * Tests user profile, following, likes, comments, and profile editing
 */

const request = require('supertest');
const app = require('../../src/app');
const userModel = require('../../src/models/user.model');
const followModel = require('../../src/models/follow.model');
const likeModel = require('../../src/models/likes.model');
const saveModel = require('../../src/models/save.model');
const commentModel = require('../../src/models/comment.model');
const { generateAuthTokens } = require('../setup/testHelpers');

describe('User Controller Integration Tests', () => {
  let user, userToken, partner, food1, food2;

  beforeEach(async () => {
    // Create test user
    user = await createTestUser({ 
      email: 'usercontroller@test.com',
      fullName: 'Test User Controller'
    });
    const userTokens = generateAuthTokens(user._id, 'user');
    userToken = userTokens.accessToken;

    // Create test food partner
    partner = await createTestFoodPartner({ email: 'userpartner@test.com' });

    // Create test food items
    food1 = await createTestFood(partner, { name: 'Test Food 1' });
    food2 = await createTestFood(partner, { name: 'Test Food 2' });
  });

  describe('GET /api/v1/user - Get User Profile', () => {
    it('should get user profile with authentication', async () => {
      const res = await request(app)
        .get('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data).toHaveProperty('fullName');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data.email).toBe('usercontroller@test.com');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/user')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should include liked foods in profile', async () => {
      // Like a food
      await likeModel.create({ user: user._id, food: food1._id });

      const res = await request(app)
        .get('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data.likedFoods).toBeDefined();
      expect(Array.isArray(res.body.data.likedFoods)).toBe(true);
      expect(res.body.data.likedFoods.length).toBe(1);
      expect(res.body.data.likedFoods[0].name).toBe('Test Food 1');
    });

    it('should include following list in profile', async () => {
      // Follow partner
      await followModel.create({ user: user._id, foodpartner: partner._id });

      const res = await request(app)
        .get('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data.following).toBeDefined();
      expect(Array.isArray(res.body.data.following)).toBe(true);
      expect(res.body.data.following.length).toBe(1);
      expect(res.body.data.following[0]._id.toString()).toBe(partner._id.toString());
    });

    it('should include comments in profile', async () => {
      // Add comment
      await commentModel.create({
        user: user._id,
        food: food1._id,
        comment: 'Great food!'
      });

      const res = await request(app)
        .get('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data.comments).toBeDefined();
      expect(Array.isArray(res.body.data.comments)).toBe(true);
      expect(res.body.data.comments.length).toBe(1);
      expect(res.body.data.comments[0].comment).toBe('Great food!');
    });

    it('should handle user with no activity', async () => {
      const res = await request(app)
        .get('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data.likedFoods).toEqual([]);
      expect(res.body.data.following).toEqual([]);
      expect(res.body.data.comments).toEqual([]);
    });

    it('should not expose password in response', async () => {
      const res = await request(app)
        .get('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data).not.toHaveProperty('password');
    });
  });

  describe('GET /api/v1/user/follows - Get Following List', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/user/follows')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return empty array when user follows no partners', async () => {
      const res = await request(app)
        .get('/api/v1/user/follows')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.message).toBe('No follows found');
    });

    it('should return list of followed partners', async () => {
      await followModel.create({ user: user._id, foodpartner: partner._id });

      const res = await request(app)
        .get('/api/v1/user/follows')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]._id.toString()).toBe(partner._id.toString());
    });

    it('should return multiple followed partners', async () => {
      const partner2 = await createTestFoodPartner({ email: 'partner2@test.com' });
      await followModel.create({ user: user._id, foodpartner: partner._id });
      await followModel.create({ user: user._id, foodpartner: partner2._id });

      const res = await request(app)
        .get('/api/v1/user/follows')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
    });
  });

  describe('GET /api/v1/user/likes - Get Liked Foods', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/user/likes')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 when user has no likes', async () => {
      const res = await request(app)
        .get('/api/v1/user/likes')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return list of liked foods', async () => {
      await likeModel.create({ user: user._id, food: food1._id });

      const res = await request(app)
        .get('/api/v1/user/likes')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should include food details in liked foods', async () => {
      await likeModel.create({ user: user._id, food: food1._id });

      const res = await request(app)
        .get('/api/v1/user/likes')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data[0].food).toBeDefined();
      expect(res.body.data[0].food.name).toBe('Test Food 1');
    });

    it('should return multiple liked foods', async () => {
      await likeModel.create({ user: user._id, food: food1._id });
      await likeModel.create({ user: user._id, food: food2._id });

      const res = await request(app)
        .get('/api/v1/user/likes')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
    });
  });

  describe('GET /api/v1/user/comments - Get User Comments', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/user/comments')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return empty array when user has no comments', async () => {
      const res = await request(app)
        .get('/api/v1/user/comments')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return list of user comments', async () => {
      await commentModel.create({
        user: user._id,
        food: food1._id,
        comment: 'Delicious!'
      });

      const res = await request(app)
        .get('/api/v1/user/comments')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].comment).toBe('Delicious!');
    });

    it('should include food details in comments', async () => {
      await commentModel.create({
        user: user._id,
        food: food1._id,
        comment: 'Amazing!'
      });

      const res = await request(app)
        .get('/api/v1/user/comments')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data[0].food).toBeDefined();
      expect(res.body.data[0].food.name).toBe('Test Food 1');
    });

    it('should return multiple comments', async () => {
      await commentModel.create({
        user: user._id,
        food: food1._id,
        comment: 'Great!'
      });
      await commentModel.create({
        user: user._id,
        food: food2._id,
        comment: 'Excellent!'
      });

      const res = await request(app)
        .get('/api/v1/user/comments')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
    });
  });

  describe('PATCH /api/v1/user - Edit User Profile', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .patch('/api/v1/user')
        .send({ fullName: 'New Name' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should update fullName', async () => {
      const res = await request(app)
        .patch('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ fullName: 'Updated Name' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Updated Name');
    });

    it('should sanitize fullName input', async () => {
      const res = await request(app)
        .patch('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ fullName: '<script>alert("xss")</script>Sanitized Name' })
        .expect(200);

      expect(res.body.data.fullName).not.toContain('<script>');
      expect(res.body.data.fullName).toContain('Sanitized Name');
    });

    it('should allow password update', async () => {
      const res = await request(app)
        .patch('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ password: 'NewPassword123!' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should reject multiple field updates', async () => {
      const res = await request(app)
        .patch('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ 
          fullName: 'New Name',
          password: 'NewPass123'
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should reject unauthorized field updates', async () => {
      const res = await request(app)
        .patch('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ email: 'newemail@test.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should not expose password in update response', async () => {
      const res = await request(app)
        .patch('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ fullName: 'New Name' })
        .expect(200);

      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should persist fullName update in database', async () => {
      await request(app)
        .patch('/api/v1/user')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ fullName: 'Persisted Name' })
        .expect(200);

      const updatedUser = await userModel.findById(user._id);
      expect(updatedUser.fullName).toBe('Persisted Name');
    });
  });
});
