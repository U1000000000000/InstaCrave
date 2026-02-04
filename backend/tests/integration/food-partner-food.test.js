/**
 * Integration Tests: Food Partner Food CRUD Operations
 * Tests food partner creating, editing, and deleting food items
 */

const request = require('supertest');
const app = require('../../src/app');
const foodModel = require('../../src/models/food.model');
const { generateAuthTokens } = require('../setup/testHelpers');

describe('Food Partner Food CRUD Operations', () => {
  let partner, partnerToken, food1;

  beforeEach(async () => {
    // Create test food partner
    partner = await createTestFoodPartner({ email: 'foodpartner@test.com' });
    const partnerTokens = generateAuthTokens(partner._id, 'foodPartner');
    partnerToken = partnerTokens.accessToken;

    // Create test food
    food1 = await foodModel.create({
      name: 'Test Pizza',
      description: 'Delicious pizza',
      video: 'https://example.com/video.mp4',
      foodPartner: partner._id,
      isOrderable: true,
      price: 15.99,
    });
  });

  describe('PATCH /api/v2/food/:id - Edit Food', () => {
    it('should edit food name', async () => {
      const res = await request(app)
        .patch(`/api/v2/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ name: 'Updated Pizza' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Pizza');
    });

    it('should edit food description', async () => {
      const res = await request(app)
        .patch(`/api/v2/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ description: 'New description' })
        .expect(200);

      expect(res.body.data.description).toBe('New description');
    });

    it('should edit food price', async () => {
      const res = await request(app)
        .patch(`/api/v2/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ price: 19.99 })
        .expect(200);

      expect(res.body.data.price).toBe(19.99);
    });

    it('should sanitize HTML in name', async () => {
      const res = await request(app)
        .patch(`/api/v2/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ name: '<script>alert("xss")</script>Safe Name' })
        .expect(200);

      expect(res.body.data.name).not.toContain('<script>');
      expect(res.body.data.name).toContain('Safe Name');
    });

    it('should only allow one field update at a time', async () => {
      await request(app)
        .patch(`/api/v2/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ name: 'New Name', price: 25 })
        .expect(400);
    });

    it('should reject unauthorized food partner', async () => {
      const partner2 = await createTestFoodPartner({ email: 'other@test.com' });
      const otherTokens = generateAuthTokens(partner2._id, 'foodPartner');

      await request(app)
        .patch(`/api/v2/food/${food1._id}`)
        .set('Cookie', `accessToken=${otherTokens.accessToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('should return 404 for non-existent food', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .patch(`/api/v2/food/${fakeId}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v2/food/${food1._id}`)
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should reject disallowed fields', async () => {
      await request(app)
        .patch(`/api/v2/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ invalidField: 'value' })
        .expect(400);
    });
  });

  describe('DELETE /api/v2/food/:foodId - Delete Food', () => {
    it('should delete food item', async () => {
      const res = await request(app)
        .delete(`/api/v2/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted/i);

      const deletedFood = await foodModel.findById(food1._id);
      expect(deletedFood).toBeNull();
    });

    it('should delete associated comments, likes, and saves', async () => {
      const commentModel = require('../../src/models/comment.model');
      const likeModel = require('../../src/models/likes.model');
      const saveModel = require('../../src/models/save.model');
      const user = await createTestUser({ email: 'user@test.com' });

      await commentModel.create({ user: user._id, food: food1._id, comment: 'Test' });
      await likeModel.create({ user: user._id, food: food1._id });
      await saveModel.create({ user: user._id, food: food1._id });

      await request(app)
        .delete(`/api/v2/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .expect(200);

      const comments = await commentModel.find({ food: food1._id });
      const likes = await likeModel.find({ food: food1._id });
      const saves = await saveModel.find({ food: food1._id });

      expect(comments.length).toBe(0);
      expect(likes.length).toBe(0);
      expect(saves.length).toBe(0);
    });

    it('should reject unauthorized food partner', async () => {
      const partner2 = await createTestFoodPartner({ email: 'other@test.com' });
      const otherTokens = generateAuthTokens(partner2._id, 'foodPartner');

      await request(app)
        .delete(`/api/v2/food/${food1._id}`)
        .set('Cookie', `accessToken=${otherTokens.accessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent food', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/api/v2/food/${fakeId}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/v2/food/${food1._id}`)
        .expect(401);
    });
  });
});
