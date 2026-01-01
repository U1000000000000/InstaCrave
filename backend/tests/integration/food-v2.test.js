/**
 * Integration Tests: Food v2 Operations
 * Tests advanced food features including followed food items and enhanced filtering
 */

const request = require('supertest');
const app = require('../../src/app');
const foodModel = require('../../src/models/food.model');
const likeModel = require('../../src/models/likes.model');
const saveModel = require('../../src/models/save.model');
const followModel = require('../../src/models/follow.model');
const { generateAuthTokens } = require('../setup/testHelpers');

describe('Food v2 Integration Tests', () => {
  let user, userToken, partner, partnerToken, food1, food2, food3;

  beforeEach(async () => {
    // Create test user
    user = await createTestUser({ email: 'foodv2user@test.com' });
    const userTokens = generateAuthTokens(user._id, 'user');
    userToken = userTokens.accessToken;

    // Create test food partner
    partner = await createTestFoodPartner({ email: 'foodv2partner@test.com' });
    const partnerTokens = generateAuthTokens(partner._id, 'foodPartner');
    partnerToken = partnerTokens.accessToken;

    // Create test food items
    food1 = await createTestFood(partner, { name: 'Test Pizza', price: 15.99 });
    food2 = await createTestFood(partner, { name: 'Test Burger', price: 12.99 });
    food3 = await createTestFood(partner, { name: 'Test Salad', price: 8.99 });
  });

  describe('GET /api/v2/food - Get Food Items with Filters', () => {
    it('should get all food items with authentication', async () => {
      const res = await request(app)
        .get('/api/v2/food')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should get food items with authentication and include like/save status', async () => {
      // Like food1
      await likeModel.create({ user: user._id, food: food1._id });

      const res = await request(app)
        .get('/api/v2/food')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const likedFood = res.body.data.find(f => f._id.toString() === food1._id.toString());
      expect(likedFood).toBeDefined();
      expect(likedFood.isLiked).toBe(true);
    });

    it('should support pagination with limit and skip', async () => {
      const res = await request(app)
        .get('/api/v2/food')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ limit: 2, skip: 0 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.skip).toBe(0);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should filter by name', async () => {
      const res = await request(app)
        .get('/api/v2/food')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ name: 'Pizza' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some(f => f.name.includes('Pizza'))).toBe(true);
    });

    it('should filter by price range', async () => {
      const res = await request(app)
        .get('/api/v2/food')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ 'price[lte]': 10 })
        .expect(200);

      expect(res.body.success).toBe(true);
      if (res.body.data.length > 0) {
        res.body.data.forEach(food => {
          if (food.price) {
            expect(food.price).toBeLessThanOrEqual(10);
          }
        });
      }
    });

    it('should sort by price ascending', async () => {
      const res = await request(app)
        .get('/api/v2/food')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ sort: 'price' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      // Verify sorting
      for (let i = 1; i < res.body.data.length; i++) {
        if (res.body.data[i-1].price && res.body.data[i].price) {
          expect(res.body.data[i].price).toBeGreaterThanOrEqual(res.body.data[i-1].price);
        }
      }
    });

    it('should sort by price descending', async () => {
      const res = await request(app)
        .get('/api/v2/food')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ sort: '-price' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      // Verify sorting
      for (let i = 1; i < res.body.data.length; i++) {
        if (res.body.data[i-1].price && res.body.data[i].price) {
          expect(res.body.data[i].price).toBeLessThanOrEqual(res.body.data[i-1].price);
        }
      }
    });

    it('should include foodPartner details in response', async () => {
      const res = await request(app)
        .get('/api/v2/food')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0].foodPartner).toBeDefined();
        expect(res.body.data[0].foodPartner).toHaveProperty('name');
      }
    });

    it('should include pagination metadata', async () => {
      const res = await request(app)
        .get('/api/v2/food')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ limit: 2 })
        .expect(200);

      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('skip');
      expect(res.body.pagination).toHaveProperty('hasNext');
      expect(res.body.pagination).toHaveProperty('hasPrev');
    });

    it('should show isFollowing status when user follows partner', async () => {
      // Follow the partner
      await followModel.create({ user: user._id, foodpartner: partner._id });

      const res = await request(app)
        .get('/api/v2/food')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const partnerFood = res.body.data.find(f => f.foodPartner._id.toString() === partner._id.toString());
      if (partnerFood) {
        expect(partnerFood.isFollowing).toBe(true);
      }
    });
  });

  describe('GET /api/v2/food/followed - Get Followed Food Items', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v2/food/followed')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return empty array when user follows no partners', async () => {
      const res = await request(app)
        .get('/api/v2/food/followed')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return food items from followed partners only', async () => {
      // Follow the partner
      await followModel.create({ user: user._id, foodpartner: partner._id });

      const res = await request(app)
        .get('/api/v2/food/followed')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      res.body.data.forEach(food => {
        expect(food.foodPartner._id.toString()).toBe(partner._id.toString());
      });
    });

    it('should include like and save status for followed food', async () => {
      // Follow partner and like one food
      await followModel.create({ user: user._id, foodpartner: partner._id });
      await likeModel.create({ user: user._id, food: food1._id });

      const res = await request(app)
        .get('/api/v2/food/followed')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const likedFood = res.body.data.find(f => f._id.toString() === food1._id.toString());
      expect(likedFood).toBeDefined();
      expect(likedFood.isLiked).toBe(true);
      expect(likedFood.isFollowing).toBe(true);
    });

    it('should support pagination for followed food', async () => {
      await followModel.create({ user: user._id, foodpartner: partner._id });

      const res = await request(app)
        .get('/api/v2/food/followed?limit=2&skip=0')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should support filtering followed food by name', async () => {
      await followModel.create({ user: user._id, foodpartner: partner._id });

      const res = await request(app)
        .get('/api/v2/food/followed?name=Pizza')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data.some(f => f.name.includes('Pizza'))).toBe(true);
      }
    });

    it('should support sorting followed food', async () => {
      await followModel.create({ user: user._id, foodpartner: partner._id });

      const res = await request(app)
        .get('/api/v2/food/followed?sort=-price')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by multiple partners when following multiple', async () => {
      // Create another partner and food
      const partner2 = await createTestFoodPartner({ email: 'partner2v2@test.com' });
      const food4 = await createTestFood(partner2, { name: 'Partner2 Food' });

      // Follow both partners
      await followModel.create({ user: user._id, foodpartner: partner._id });
      await followModel.create({ user: user._id, foodpartner: partner2._id });

      const res = await request(app)
        .get('/api/v2/food/followed')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      
      const partnerIds = [...new Set(res.body.data.map(f => f.foodPartner._id.toString()))];
      expect(partnerIds).toContain(partner._id.toString());
      expect(partnerIds).toContain(partner2._id.toString());
    });

    it('should include pagination metadata for followed food', async () => {
      await followModel.create({ user: user._id, foodpartner: partner._id });

      const res = await request(app)
        .get('/api/v2/food/followed')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('hasNext');
      expect(res.body.pagination).toHaveProperty('hasPrev');
    });
  });

  describe('GET /api/v2/food/save - Get Saved Food Items', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v2/food/save')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return empty array when no saved food', async () => {
      const res = await request(app)
        .get('/api/v2/food/save')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return saved food items', async () => {
      await saveModel.create({ user: user._id, food: food1._id });
      await saveModel.create({ user: user._id, food: food2._id });

      const res = await request(app)
        .get('/api/v2/food/save')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every(f => f.isSaved)).toBe(true);
    });

    it('should support pagination for saved food', async () => {
      await saveModel.create({ user: user._id, food: food1._id });
      await saveModel.create({ user: user._id, food: food2._id });

      const res = await request(app)
        .get('/api/v2/food/save?limit=1')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
    });
  });

  describe('POST /api/v2/food/like - Like/Unlike Food', () => {
    it('should like a food item', async () => {
      const res = await request(app)
        .post('/api/v2/food/like')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/liked/i);

      const updatedFood = await foodModel.findById(food1._id);
      expect(updatedFood.likeCount).toBe(1);
    });

    it('should unlike a food item', async () => {
      await likeModel.create({ user: user._id, food: food1._id });
      await foodModel.findByIdAndUpdate(food1._id, { $inc: { likeCount: 1 } });

      const res = await request(app)
        .post('/api/v2/food/like')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/unliked/i);

      const updatedFood = await foodModel.findById(food1._id);
      expect(updatedFood.likeCount).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v2/food/like')
        .send({ foodId: food1._id })
        .expect(401);
    });
  });

  describe('POST /api/v2/food/save - Save/Unsave Food', () => {
    it('should save a food item', async () => {
      const res = await request(app)
        .post('/api/v2/food/save')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/saved/i);

      const updatedFood = await foodModel.findById(food1._id);
      expect(updatedFood.savesCount).toBe(1);
    });

    it('should unsave a food item', async () => {
      await saveModel.create({ user: user._id, food: food1._id });
      await foodModel.findByIdAndUpdate(food1._id, { $inc: { savesCount: 1 } });

      const res = await request(app)
        .post('/api/v2/food/save')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/unsaved/i);

      const updatedFood = await foodModel.findById(food1._id);
      expect(updatedFood.savesCount).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v2/food/save')
        .send({ foodId: food1._id })
        .expect(401);
    });
  });

  describe('POST /api/v2/food/comment - Comment Operations', () => {
    it('should add a comment to food', async () => {
      const res = await request(app)
        .post('/api/v2/food/comment')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id, comment: 'Great food!' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/commented/i);

      const updatedFood = await foodModel.findById(food1._id);
      expect(updatedFood.commentCount).toBe(1);
    });

    it('should sanitize comment HTML', async () => {
      const res = await request(app)
        .post('/api/v2/food/comment')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id, comment: '<script>alert("xss")</script>Nice!' })
        .expect(200);

      expect(res.body.data.comment).not.toContain('<script>');
      expect(res.body.data.comment).toContain('Nice!');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v2/food/comment')
        .send({ foodId: food1._id, comment: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/v2/food/comment - Get Comments', () => {
    it('should get comments for a food item', async () => {
      const commentModel = require('../../src/models/comment.model');
      await commentModel.create({ user: user._id, food: food1._id, comment: 'Comment 1' });
      await commentModel.create({ user: user._id, food: food1._id, comment: 'Comment 2' });

      const res = await request(app)
        .get('/api/v2/food/comment')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ foodId: food1._id.toString() })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should return 404 when no comments exist', async () => {
      await request(app)
        .get('/api/v2/food/comment')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ foodId: food1._id.toString() })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v2/food/comment')
        .query({ foodId: food1._id.toString() })
        .expect(401);
    });
  });

  describe('POST /api/v2/food/delete-comment - Delete Comment', () => {
    it('should delete own comment', async () => {
      const commentModel = require('../../src/models/comment.model');
      const comment = await commentModel.create({ user: user._id, food: food1._id, comment: 'Delete me' });
      await foodModel.findByIdAndUpdate(food1._id, { $inc: { commentCount: 1 } });

      const res = await request(app)
        .post('/api/v2/food/delete-comment')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ commentId: comment._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted/i);

      const updatedFood = await foodModel.findById(food1._id);
      expect(updatedFood.commentCount).toBe(0);
    });

    it('should not delete other user comment', async () => {
      const user2 = await createTestUser({ email: 'user2@test.com' });
      const commentModel = require('../../src/models/comment.model');
      const comment = await commentModel.create({ user: user2._id, food: food1._id, comment: 'Not yours' });

      await request(app)
        .post('/api/v2/food/delete-comment')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ commentId: comment._id })
        .expect(403);
    });

    it('should return 404 for non-existent comment', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .post('/api/v2/food/delete-comment')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ commentId: fakeId })
        .expect(404);
    });

    it('should require authentication', async () => {
      const commentModel = require('../../src/models/comment.model');
      const comment = await commentModel.create({ user: user._id, food: food1._id, comment: 'Test' });

      await request(app)
        .post('/api/v2/food/delete-comment')
        .send({ commentId: comment._id })
        .expect(401);
    });
  });

  describe('POST /api/v2/food/share - Update Share Count', () => {
    it('should increment share count', async () => {
      const res = await request(app)
        .post('/api/v2/food/share')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.currentShareCount).toBe(1);

      const updatedFood = await foodModel.findById(food1._id);
      expect(updatedFood.shareCount).toBe(1);
    });

    it('should increment share count multiple times', async () => {
      await request(app)
        .post('/api/v2/food/share')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      const res = await request(app)
        .post('/api/v2/food/share')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: food1._id })
        .expect(200);

      expect(res.body.data.currentShareCount).toBe(2);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v2/food/share')
        .send({ foodId: food1._id })
        .expect(401);
    });

    it('should return 404 for non-existent food', async () => {
      const mongoose = require('mongoose');
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .post('/api/v2/food/share')
        .set('Cookie', `accessToken=${userToken}`)
        .send({ foodId: fakeId })
        .expect(404);
    });
  });
});
