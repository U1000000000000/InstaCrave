/**
 * Integration Tests: Search Controller
 * Tests search and explore functionality
 */

const request = require('supertest');
const app = require('../../src/app');
const foodModel = require('../../src/models/food.model');
const foodPartnerModel = require('../../src/models/foodpartner.model');
const followModel = require('../../src/models/follow.model');
const { generateAuthTokens } = require('../setup/testHelpers');

describe('Search Controller Integration Tests', () => {
  let user, userToken, partner1, partner2, food1, food2, food3;

  beforeEach(async () => {
    // Create test user
    user = await createTestUser({ email: 'searchuser@test.com' });
    const userTokens = generateAuthTokens(user._id, 'user');
    userToken = userTokens.accessToken;

    // Create test food partners
    partner1 = await createTestFoodPartner({ 
      email: 'pizzaplace@test.com',
      name: 'Pizza Palace'
    });
    partner2 = await createTestFoodPartner({ 
      email: 'burgerking@test.com',
      name: 'Burger Kingdom'
    });

    // Create test food items
    food1 = await createTestFood(partner1, { 
      name: 'Margherita Pizza',
      description: 'Classic Italian pizza with tomato and basil'
    });
    food2 = await createTestFood(partner1, { 
      name: 'Pepperoni Pizza',
      description: 'Spicy pepperoni with cheese'
    });
    food3 = await createTestFood(partner2, { 
      name: 'Cheese Burger',
      description: 'Juicy burger with cheddar cheese'
    });
  });

  describe('GET /api/v1/search - Search Endpoint', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .query({ query: 'Pizza' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should require query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Query parameter is required');
    });

    it('should search for food items by name', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ query: 'Pizza', type: 'food' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.foodItems.length).toBe(2);
      expect(res.body.data.foodPartners.length).toBe(0);
    });

    it('should search for food items by description', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ query: 'cheese', type: 'food' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.foodItems.length).toBeGreaterThanOrEqual(2);
    });

    it('should search for food partners by name', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ query: 'Pizza', type: 'partner' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.foodItems.length).toBe(0);
      expect(res.body.data.foodPartners.length).toBe(1);
      expect(res.body.data.foodPartners[0].name).toBe('Pizza Palace');
    });

    it('should search both food and partners with type=all', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ query: 'Pizza', type: 'all' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.foodItems.length).toBe(2);
      expect(res.body.data.foodPartners.length).toBe(1);
    });

    it('should default to type=all when type not specified', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ query: 'Burger' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('foodItems');
      expect(res.body.data).toHaveProperty('foodPartners');
    });

    it('should perform case-insensitive search', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ query: 'PIZZA', type: 'food' })
        .expect(200);

      expect(res.body.data.foodItems.length).toBe(2);
    });

    it('should return empty arrays when no results found', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ query: 'NonexistentFood123', type: 'all' })
        .expect(200);

      expect(res.body.data.foodItems).toEqual([]);
      expect(res.body.data.foodPartners).toEqual([]);
    });

    it('should handle partial matches', async () => {
      const res = await request(app)
        .get('/api/v1/search')
        .set('Cookie', `accessToken=${userToken}`)
        .query({ query: 'Piz', type: 'food' })
        .expect(200);

      expect(res.body.data.foodItems.length).toBe(2);
    });
  });

  describe('GET /api/v1/search/explore - Explore Endpoint', () => {
    it('should work with authentication', async () => {
      const res = await request(app)
        .get('/api/v1/search/explore')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.foodItems.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.foodPartners.length).toBeGreaterThanOrEqual(2);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/search/explore')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should exclude followed partners when user authenticated', async () => {
      // User follows partner1
      await followModel.create({ user: user._id, foodpartner: partner1._id });

      const res = await request(app)
        .get('/api/v1/search/explore')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const partnerIds = res.body.data.foodPartners.map(p => p._id.toString());
      expect(partnerIds).not.toContain(partner1._id.toString());
    });

    it('should exclude food from followed partners', async () => {
      // User follows partner1
      await followModel.create({ user: user._id, foodpartner: partner1._id });

      const res = await request(app)
        .get('/api/v1/search/explore')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      // Food items from partner1 should not be in explore
      const foodFromPartner1 = res.body.data.foodItems.filter(
        f => f.foodPartner.toString() === partner1._id.toString()
      );
      expect(foodFromPartner1.length).toBe(0);
    });

    it('should include mealCount in food partners', async () => {
      const res = await request(app)
        .get('/api/v1/search/explore')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      const pizzaPalace = res.body.data.foodPartners.find(
        p => p.name === 'Pizza Palace'
      );
      expect(pizzaPalace).toBeDefined();
      expect(pizzaPalace.mealCount).toBeDefined();
      expect(pizzaPalace.mealCount).toBeGreaterThanOrEqual(2);
    });

    it('should return empty when user follows all partners', async () => {
      // User follows all partners
      await followModel.create({ user: user._id, foodpartner: partner1._id });
      await followModel.create({ user: user._id, foodpartner: partner2._id });

      const res = await request(app)
        .get('/api/v1/search/explore')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(res.body.data.foodItems.length).toBe(0);
      expect(res.body.data.foodPartners.length).toBe(0);
    });

    it('should include partner profile details', async () => {
      const res = await request(app)
        .get('/api/v1/search/explore')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      const partner = res.body.data.foodPartners[0];
      expect(partner).toHaveProperty('name');
      expect(partner).toHaveProperty('profileImage');
      expect(partner).toHaveProperty('mealCount');
    });
  });
});
