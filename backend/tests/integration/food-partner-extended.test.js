const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/user.model');
const FoodPartner = require('../../src/models/foodpartner.model');
const Food = require('../../src/models/food.model');
const Follow = require('../../src/models/follow.model');
const mongoose = require('mongoose');
// Test helpers loaded globally via jest setupFilesAfterEnv
const { generateAuthTokens } = require('../setup/testHelpers');

describe('Food Partner Extended Integration Tests', () => {
  let userTokens;
  let partnerTokens;
  let otherPartnerTokens;
  let testUser;
  let testPartner;
  let otherPartner;
  let testFood1;
  let testFood2;

  beforeEach(async () => {
    // Create test user
    testUser = await createTestUser({
      email: 'test-user-fp@test.com',
      username: 'test-user-fp'
    });
    userTokens = generateAuthTokens(testUser._id, 'user');

    // Create test food partner
    testPartner = await createTestFoodPartner({
      email: 'test-partner-extended@test.com',
      name: 'Test Partner Extended'
    });
    partnerTokens = generateAuthTokens(testPartner._id, 'foodPartner');

    // Create another food partner for follow tests
    otherPartner = await createTestFoodPartner({
      email: 'other-partner-extended@test.com',
      name: 'Other Partner Extended'
    });
    otherPartnerTokens = generateAuthTokens(otherPartner._id, 'foodPartner');

    // Create test foods for the partner
    testFood1 = await createTestFood(testPartner, {
      name: 'Test Food 1'
    });

    testFood2 = await createTestFood(testPartner, {
      name: 'Test Food 2'
    });
  });

  describe('GET /api/v1/food-partner/:id - Get Partner by ID', () => {
    it('should get food partner by ID with authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/food-partner/${testPartner._id}`)
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data.name).toBe('Test Partner Extended');
    });

    it('should get food partner with auth and include follow status', async () => {
      const response = await request(app)
        .get(`/api/v1/food-partner/${testPartner._id}`)
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isFollowing');
      expect(response.body.data.isFollowing).toBe(false);
    });

    it('should include food items in partner response', async () => {
      const response = await request(app)
        .get(`/api/v1/food-partner/${testPartner._id}`)
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('foodItems');
      expect(Array.isArray(response.body.data.foodItems)).toBe(true);
      expect(response.body.data.foodItems.length).toBeGreaterThanOrEqual(2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/food-partner/${testPartner._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent partner ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/food-partner/${fakeId}`)
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid partner ID format', async () => {
      const response = await request(app)
        .get('/api/v1/food-partner/invalid-id-format')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should show isFollowing=true after user follows partner', async () => {
      // First, follow the partner
      await Follow.create({
        user: testUser._id,
        foodpartner: testPartner._id
      });

      const response = await request(app)
        .get(`/api/v1/food-partner/${testPartner._id}`)
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .expect(200);

      expect(response.body.data.isFollowing).toBe(true);

      // Cleanup
      await Follow.deleteOne({ user: testUser._id, foodpartner: testPartner._id });
    });
  });

  describe('GET /api/v1/food-partner - Get Current Partner Profile', () => {
    it('should get current food partner profile with authentication', async () => {
      const response = await request(app)
        .get('/api/v1/food-partner')
        .set('Cookie', `accessToken=${partnerTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data._id.toString()).toBe(testPartner._id.toString());
      expect(response.body.data.name).toBe('Test Partner Extended');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/food-partner')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject user role access', async () => {
      const response = await request(app)
        .get('/api/v1/food-partner')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should include partner statistics in profile', async () => {
      const response = await request(app)
        .get('/api/v1/food-partner')
        .set('Cookie', `accessToken=${partnerTokens.accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('createdAt');
    });
  });

  describe('PATCH /api/v1/food-partner/edit - Update Partner Profile', () => {
    it('should update name', async () => {
      const response = await request(app)
        .patch('/api/v1/food-partner/edit')
        .set('Cookie', `accessToken=${partnerTokens.accessToken}`)
        .send({ name: 'Updated Business Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Business Name');

      // Restore original name
      await FoodPartner.findByIdAndUpdate(testPartner._id, { 
        name: 'Test Partner Extended' 
      });
    });

    it('should reject multiple field updates at once', async () => {
      const updates = {
        name: 'Multi Update Test',
        contactName: 'Updated Contact Name'
      };

      const response = await request(app)
        .patch('/api/v1/food-partner/edit')
        .set('Cookie', `accessToken=${partnerTokens.accessToken}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('exactly one field');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/api/v1/food-partner/edit')
        .send({ name: 'Should Fail' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject user role access', async () => {
      const response = await request(app)
        .patch('/api/v1/food-partner/edit')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .send({ name: 'Should Fail' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize input fields', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>Sanitized Name'
      };

      const response = await request(app)
        .patch('/api/v1/food-partner/edit')
        .set('Cookie', `accessToken=${partnerTokens.accessToken}`)
        .send(maliciousInput)
        .expect(200);

      expect(response.body.data.name).not.toContain('<script>');

      // Restore
      await FoodPartner.findByIdAndUpdate(testPartner._id, { 
        name: 'Test Partner Extended' 
      });
    });

    it('should reject updating email field', async () => {
      const originalEmail = testPartner.email;

      const response = await request(app)
        .patch('/api/v1/food-partner/edit')
        .set('Cookie', `accessToken=${partnerTokens.accessToken}`)
        .send({
          email: 'newemail@test.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot update field');

      const partner = await FoodPartner.findById(testPartner._id);
      expect(partner.email).toBe(originalEmail);
    });
  });

  describe('POST /api/v1/food-partner/follow - Follow/Unfollow Partner', () => {
    beforeEach(async () => {
      // Clean up any existing follows
      await Follow.deleteMany({ 
        user: testUser._id, 
        foodpartner: otherPartner._id 
      });
    });

    it('should allow user to follow a partner', async () => {
      const response = await request(app)
        .post('/api/v1/food-partner/follow')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .send({ foodpartner: otherPartner._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message.toLowerCase()).toContain('follow');

      // Verify follow was created
      const follow = await Follow.findOne({
        user: testUser._id,
        foodpartner: otherPartner._id
      });
      expect(follow).not.toBeNull();
    });

    it('should allow user to unfollow a partner', async () => {
      // First create a follow
      await Follow.create({
        user: testUser._id,
        foodpartner: otherPartner._id
      });

      const response = await request(app)
        .post('/api/v1/food-partner/follow')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .send({ foodpartner: otherPartner._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('unfollow');

      // Verify follow was removed
      const follow = await Follow.findOne({
        user: testUser._id,
        foodpartner: otherPartner._id
      });
      expect(follow).toBeNull();
    });

    it('should toggle follow status correctly', async () => {
      // Follow
      await request(app)
        .post('/api/v1/food-partner/follow')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .send({ foodpartner: otherPartner._id.toString() })
        .expect(200);

      let follow = await Follow.findOne({
        user: testUser._id,
        foodpartner: otherPartner._id
      });
      expect(follow).not.toBeNull();

      // Unfollow
      await request(app)
        .post('/api/v1/food-partner/follow')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .send({ foodpartner: otherPartner._id.toString() })
        .expect(200);

      follow = await Follow.findOne({
        user: testUser._id,
        foodpartner: otherPartner._id
      });
      expect(follow).toBeNull();

      // Follow again
      await request(app)
        .post('/api/v1/food-partner/follow')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .send({ foodpartner: otherPartner._id.toString() })
        .expect(200);

      follow = await Follow.findOne({
        user: testUser._id,
        foodpartner: otherPartner._id
      });
      expect(follow).not.toBeNull();
    });

    it('should require user authentication', async () => {
      const response = await request(app)
        .post('/api/v1/food-partner/follow')
        .send({ foodpartner: otherPartner._id.toString() })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject partner role from following', async () => {
      const response = await request(app)
        .post('/api/v1/food-partner/follow')
        .set('Cookie', `accessToken=${partnerTokens.accessToken}`)
        .send({ foodpartner: otherPartner._id.toString() })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent partner', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/v1/food-partner/follow')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .send({ foodpartner: fakeId.toString() })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid partner ID format', async () => {
      const response = await request(app)
        .post('/api/v1/food-partner/follow')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .send({ foodpartner: 'invalid-id' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 if foodPartnerId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/food-partner/follow')
        .set('Cookie', `accessToken=${userTokens.accessToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
