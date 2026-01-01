/**
 * Integration Tests: Food V1 API (Legacy)
 * Tests the older v1 food API endpoints for backward compatibility
 */

const request = require('supertest');
const app = require('../../src/app');
const foodModel = require('../../src/models/food.model');
const likeModel = require('../../src/models/likes.model');
const saveModel = require('../../src/models/save.model');
const commentModel = require('../../src/models/comment.model');
const followModel = require('../../src/models/follow.model');
const { generateAuthTokens } = require('../setup/testHelpers');

describe('Food V1 API Integration Tests', () => {
  let user, userToken, partner, partnerToken, food1, food2;

  beforeEach(async () => {
    // Create test user
    user = await createTestUser({ email: 'foodv1user@test.com' });
    const userTokens = generateAuthTokens(user._id, 'user');
    userToken = userTokens.accessToken;

    // Create test food partner
    partner = await createTestFoodPartner({ email: 'foodv1partner@test.com' });
    const partnerTokens = generateAuthTokens(partner._id, 'foodPartner');
    partnerToken = partnerTokens.accessToken;

    // Create test food items
    food1 = await foodModel.create({
      name: 'V1 Pizza',
      description: 'Classic pizza',
      video: 'https://example.com/pizza.mp4',
      foodPartner: partner._id,
      isOrderable: true,
      price: 15.99,
    });

    food2 = await foodModel.create({
      name: 'V1 Burger',
      description: 'Juicy burger',
      video: 'https://example.com/burger.mp4',
      foodPartner: partner._id,
      isOrderable: true,
      price: 12.99,
    });
  });

  describe('GET /api/v1/food - Get All Food Items', () => {
    it('should get all food items with authentication', async () => {
      const res = await request(app)
        .get('/api/v1/food')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/food')
        .expect(401);
    });

    it('should get food items with like/save status when authenticated', async () => {
      await likeModel.create({ user: user._id, food: food1._id });
      await saveModel.create({ user: user._id, food: food2._id });

      const res = await request(app)
        .get('/api/v1/food')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const likedFood = res.body.data.find(f => f._id.toString() === food1._id.toString());
      const savedFood = res.body.data.find(f => f._id.toString() === food2._id.toString());

      expect(likedFood.isLiked).toBe(true);
      expect(savedFood.isSaved).toBe(true);
    });

    it('should include foodPartner details', async () => {
      const res = await request(app)
        .get('/api/v1/food')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      const foodItem = res.body.data[0];
      expect(foodItem.foodPartner).toBeDefined();
      expect(foodItem.foodPartner.name).toBeDefined();
    });
  });

  describe('GET /api/v1/food/followed - Get Followed Food', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/food/followed')
        .expect(401);
    });

    it('should return empty array when not following anyone', async () => {
      const res = await request(app)
        .get('/api/v1/food/followed')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return food from followed partners', async () => {
      await followModel.create({ user: user._id, foodpartner: partner._id });

      const res = await request(app)
        .get('/api/v1/food/followed')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.every(f => f.foodPartner._id.toString() === partner._id.toString())).toBe(true);
    });
  });

  describe('POST /api/v1/food/like - Like Food', () => {
    it('should like a food item', async () => {
      const res = await request(app)
        .post('/api/v1/food/like')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/liked/i);

      const like = await likeModel.findOne({ user: user._id, food: food1._id });
      expect(like).toBeDefined();
    });

    it('should unlike a previously liked food', async () => {
      await likeModel.create({ user: user._id, food: food1._id });

      const res = await request(app)
        .post('/api/v1/food/like')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.message).toMatch(/unliked/i);

      const like = await likeModel.findOne({ user: user._id, food: food1._id });
      expect(like).toBeNull();
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/food/like')
        .send({ foodId: food1._id })
        .expect(401);
    });
  });

  describe('POST /api/v1/food/save - Save Food', () => {
    it('should save a food item', async () => {
      const res = await request(app)
        .post('/api/v1/food/save')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/saved/i);

      const save = await saveModel.findOne({ user: user._id, food: food1._id });
      expect(save).toBeDefined();
    });

    it('should unsave a previously saved food', async () => {
      await saveModel.create({ user: user._id, food: food1._id });

      const res = await request(app)
        .post('/api/v1/food/save')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.message).toMatch(/unsaved/i);

      const save = await saveModel.findOne({ user: user._id, food: food1._id });
      expect(save).toBeNull();
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/food/save')
        .send({ foodId: food1._id })
        .expect(401);
    });
  });

  describe('GET /api/v1/food/save - Get Saved Food', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/food/save')
        .expect(401);
    });

    it('should return 404 when no saved food', async () => {
      await request(app)
        .get('/api/v1/food/save')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(404);
    });

    it('should return saved food items', async () => {
      await saveModel.create({ user: user._id, food: food1._id });
      await saveModel.create({ user: user._id, food: food2._id });

      const res = await request(app)
        .get('/api/v1/food/save')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every(f => f.isSaved)).toBe(true);
    });
  });

  describe('POST /api/v1/food/comment - Comment on Food', () => {
    it('should add a comment', async () => {
      const res = await request(app)
        .post('/api/v1/food/comment')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id, comment: 'Delicious!' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/comment/i);

      const comment = await commentModel.findOne({ user: user._id, food: food1._id });
      expect(comment).toBeDefined();
      expect(comment.comment).toBe('Delicious!');
    });

    it('should sanitize HTML in comments', async () => {
      const res = await request(app)
        .post('/api/v1/food/comment')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id, comment: '<script>alert("xss")</script>Great food!' })
        .expect(200);

      expect(res.body.data.comment).not.toContain('<script>');
      expect(res.body.data.comment).toContain('Great food!');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/food/comment')
        .send({ foodId: food1._id, comment: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/v1/food/comment - Get Comments', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/food/comment')
        .query({ foodId: food1._id })
        .expect(401);
    });

    it('should return 404 when no comments', async () => {
      await request(app)
        .get('/api/v1/food/comment')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ foodId: food1._id.toString() })
        .expect(404);
    });

    it('should get comments for a food item', async () => {
      await commentModel.create({ user: user._id, food: food1._id, comment: 'Comment 1' });
      await commentModel.create({ user: user._id, food: food1._id, comment: 'Comment 2' });

      const res = await request(app)
        .get('/api/v1/food/comment')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ foodId: food1._id.toString() })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('POST /api/v1/food/delete-comment - Delete Comment', () => {
    it('should delete own comment', async () => {
      const comment = await commentModel.create({ 
        user: user._id, 
        food: food1._id, 
        comment: 'Delete me' 
      });

      const res = await request(app)
        .post('/api/v1/food/delete-comment')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ commentId: comment._id })
        .expect(200);

      expect(res.body.success).toBe(true);

      const deletedComment = await commentModel.findById(comment._id);
      expect(deletedComment).toBeNull();
    });

    it('should not delete other user comment', async () => {
      const user2 = await createTestUser({ email: 'user2v1@test.com' });
      const comment = await commentModel.create({
        user: user2._id,
        food: food1._id,
        comment: 'Not yours'
      });

      await request(app)
        .post('/api/v1/food/delete-comment')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ commentId: comment._id })
        .expect(403);
    });

    it('should return 404 for non-existent comment', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .post('/api/v1/food/delete-comment')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ commentId: fakeId })
        .expect(404);
    });

    it('should require authentication', async () => {
      const comment = await commentModel.create({
        user: user._id,
        food: food1._id,
        comment: 'Test'
      });

      await request(app)
        .post('/api/v1/food/delete-comment')
        .send({ commentId: comment._id })
        .expect(401);
    });
  });

  describe('PATCH /api/v1/food/:id - Edit Food (Partner)', () => {
    it('should edit food name', async () => {
      const res = await request(app)
        .patch(`/api/v1/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ name: 'Updated V1 Pizza' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated V1 Pizza');
    });

    it('should edit food description', async () => {
      const res = await request(app)
        .patch(`/api/v1/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ description: 'New description' })
        .expect(200);

      expect(res.body.data.description).toBe('New description');
    });

    it('should only allow one field at a time', async () => {
      await request(app)
        .patch(`/api/v1/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ name: 'Name', price: 20 })
        .expect(400);
    });

    it('should reject unauthorized partner', async () => {
      const partner2 = await createTestFoodPartner({ email: 'other-v1@test.com' });
      const otherTokens = generateAuthTokens(partner2._id, 'foodPartner');

      await request(app)
        .patch(`/api/v1/food/${food1._id}`)
        .set('Cookie', `accessToken=${otherTokens.accessToken}`)
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('should return 404 for non-existent food', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .patch(`/api/v1/food/${fakeId}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch(`/api/v1/food/${food1._id}`)
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/food/:foodId - Delete Food (Partner)', () => {
    it('should delete food item', async () => {
      const res = await request(app)
        .delete(`/api/v1/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const deleted = await foodModel.findById(food1._id);
      expect(deleted).toBeNull();
    });

    it('should delete associated comments, likes, saves', async () => {
      await commentModel.create({ user: user._id, food: food1._id, comment: 'Test' });
      await likeModel.create({ user: user._id, food: food1._id });
      await saveModel.create({ user: user._id, food: food1._id });

      await request(app)
        .delete(`/api/v1/food/${food1._id}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .expect(200);

      const comments = await commentModel.find({ food: food1._id });
      const likes = await likeModel.find({ food: food1._id });
      const saves = await saveModel.find({ food: food1._id });

      expect(comments.length).toBe(0);
      expect(likes.length).toBe(0);
      expect(saves.length).toBe(0);
    });

    it('should reject unauthorized partner', async () => {
      const partner2 = await createTestFoodPartner({ email: 'other2-v1@test.com' });
      const otherTokens = generateAuthTokens(partner2._id, 'foodPartner');

      await request(app)
        .delete(`/api/v1/food/${food1._id}`)
        .set('Cookie', `accessToken=${otherTokens.accessToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent food', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/api/v1/food/${fakeId}`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/v1/food/${food1._id}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/food/share - Update Share Count', () => {
    it('should increment share count', async () => {
      const res = await request(app)
        .post('/api/v1/food/share')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.currentShareCount).toBe(1);
    });

    it('should increment multiple times', async () => {
      await request(app)
        .post('/api/v1/food/share')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      const res = await request(app)
        .post('/api/v1/food/share')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.data.currentShareCount).toBe(2);
    });

    it('should return 404 for non-existent food', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .post('/api/v1/food/share')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: fakeId })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/food/share')
        .send({ foodId: food1._id })
        .expect(401);
    });
  });
});
