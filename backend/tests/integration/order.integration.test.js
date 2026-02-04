const request = require('supertest');
const app = require('../../src/app');
const orderModel = require('../../src/models/order.model');
const userModel = require('../../src/models/user.model');
const foodPartnerModel = require('../../src/models/foodpartner.model');
const foodModel = require('../../src/models/food.model');
// Test helpers loaded globally via jest setupFilesAfterEnv
const { generateAuthTokens } = require('../setup/testHelpers');

describe('Order Integration Tests', () => {
  let userToken, partnerToken, user, foodPartner, food;

  beforeEach(async () => {
    // Create user
    user = await createTestUser({
      email: 'user@test.com',
      password: 'Password123!',
      fullName: 'Test User'
    });
    const userTokens = generateAuthTokens(user._id, 'user');
    userToken = userTokens.accessToken;

    // Create food partner
    foodPartner = await createTestFoodPartner({
      email: 'partner@test.com',
      password: 'Password123!',
      name: 'Test Restaurant',
      phone: '1234567890',
      address: '123 Test St'
    });
    const partnerTokens = generateAuthTokens(foodPartner._id, 'foodPartner');
    partnerToken = partnerTokens.accessToken;

    // Create food item
    food = await createTestFood(foodPartner, {
      name: 'Test Pizza',
      description: 'Delicious test pizza',
      price: 15.99,
      isOrderable: true
    });
  });

  describe('POST /api/v1/orders - Create Order', () => {
    // TODO: Add test for concurrent orders with same idempotency key
    // Should prevent double-charging but haven't figured out how to simulate race condition in Jest
    it('should create an order successfully', async () => {
      const orderData = {
        foodId: food._id.toString(),
        quantity: 2,
        deliveryAddress: '456 User Street, Test City'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .send(orderData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order placed successfully');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.foodName).toBe('Test Pizza');
      expect(response.body.data.quantity).toBe(2);
      expect(response.body.data.totalPrice).toBe(31.98); // 15.99 * 2
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.deliveryAddress).toBe('456 User Street, Test City');
    });

    it('should sanitize HTML in delivery address', async () => {
      const orderData = {
        foodId: food._id.toString(),
        quantity: 1,
        deliveryAddress: '<script>alert("xss")</script>123 Safe St'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .send(orderData)
        .expect(200);

      expect(response.body.data.deliveryAddress).not.toContain('<script>');
      expect(response.body.data.deliveryAddress).toContain('123 Safe St');
    });

    it('should fail when food is not orderable', async () => {
      // Update food to not be orderable
      food.isOrderable = false;
      await food.save();

      const orderData = {
        foodId: food._id.toString(),
        quantity: 2,
        deliveryAddress: '456 User Street'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Food item is not available for ordering');
    });

    it('should fail when food does not exist', async () => {
      const orderData = {
        foodId: '507f1f77bcf86cd799439011', // Valid ObjectId but doesn't exist
        quantity: 2,
        deliveryAddress: '456 User Street'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Food item is not available for ordering');
    });

    it('should fail with invalid quantity (0)', async () => {
      const orderData = {
        foodId: food._id.toString(),
        quantity: 0,
        deliveryAddress: '456 User Street'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid quantity (negative)', async () => {
      const orderData = {
        foodId: food._id.toString(),
        quantity: -5,
        deliveryAddress: '456 User Street'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with short delivery address', async () => {
      const orderData = {
        foodId: food._id.toString(),
        quantity: 2,
        deliveryAddress: '123' // Less than 5 characters
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail when not authenticated', async () => {
      const orderData = {
        foodId: food._id.toString(),
        quantity: 2,
        deliveryAddress: '456 User Street'
      };

      await request(app)
        .post('/api/v1/orders')
        .send(orderData)
        .expect(401);
    });

    it('should fail when missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .send({
          foodId: food._id.toString()
          // Missing quantity and deliveryAddress
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/orders - Get User Orders', () => {
    it('should get user orders', async () => {
      // Create an order first
      await orderModel.create({
        user: user._id,
        userName: user.fullName,
        food: food._id,
        foodName: food.name,
        foodPartner: foodPartner._id,
        foodPartnerName: foodPartner.name,
        quantity: 2,
        totalPrice: 31.98,
        deliveryAddress: '456 User Street',
        status: 'pending'
      });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User orders fetched successfully');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].foodName).toBe('Test Pizza');
      expect(response.body.data[0].status).toBe('pending');
    });

    it('should return empty array when user has no orders', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should fail when not authenticated', async () => {
      await request(app)
        .get('/api/v1/orders')
        .expect(401);
    });

    it('should only return orders for authenticated user', async () => {
      // Create another user
      const otherUser = await createTestUser({
        email: 'other@test.com',
        password: 'Password123!',
        fullName: 'Other User'
      });

      // Create order for first user
      await orderModel.create({
        user: user._id,
        userName: user.fullName,
        food: food._id,
        foodName: food.name,
        foodPartner: foodPartner._id,
        foodPartnerName: foodPartner.name,
        quantity: 1,
        totalPrice: 15.99,
        deliveryAddress: '456 User Street',
        status: 'pending'
      });

      // Create order for other user
      await orderModel.create({
        user: otherUser._id,
        userName: otherUser.fullName,
        food: food._id,
        foodName: food.name,
        foodPartner: foodPartner._id,
        foodPartnerName: foodPartner.name,
        quantity: 2,
        totalPrice: 31.98,
        deliveryAddress: '789 Other Street',
        status: 'confirmed'
      });

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].quantity).toBe(1);
    });
  });

  describe('GET /api/v1/orders/partner - Get Partner Orders', () => {
    it('should get partner orders', async () => {
      // Create an order
      await orderModel.create({
        user: user._id,
        userName: user.fullName,
        food: food._id,
        foodName: food.name,
        foodPartner: foodPartner._id,
        foodPartnerName: foodPartner.name,
        quantity: 2,
        totalPrice: 31.98,
        deliveryAddress: '456 User Street',
        status: 'pending'
      });

      const response = await request(app)
        .get('/api/v1/orders/partner')
        .set('Cookie', `accessToken=${partnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Partner orders fetched successfully');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return empty array when partner has no orders', async () => {
      const response = await request(app)
        .get('/api/v1/orders/partner')
        .set('Cookie', `accessToken=${partnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should fail when not authenticated as partner', async () => {
      await request(app)
        .get('/api/v1/orders/partner')
        .set('Cookie', `accessToken=${userToken}`)
        .expect(401);
    });

    it('should only return orders for authenticated partner', async () => {
      // Create another partner
      const otherPartner = await createTestFoodPartner({
        email: 'other-partner@test.com',
        password: 'Password123!',
        name: 'Other Restaurant',
        phone: '9876543210',
        address: '789 Other St'
      });

      const otherFood = await createTestFood(otherPartner, {
        name: 'Other Pizza',
        description: 'Other pizza',
        price: 12.99,
        isOrderable: true
      });

      // Create order for first partner
      await orderModel.create({
        user: user._id,
        userName: user.fullName,
        food: food._id,
        foodName: food.name,
        foodPartner: foodPartner._id,
        foodPartnerName: foodPartner.name,
        quantity: 1,
        totalPrice: 15.99,
        deliveryAddress: '456 User Street',
        status: 'pending'
      });

      // Create order for other partner
      await orderModel.create({
        user: user._id,
        userName: user.fullName,
        food: otherFood._id,
        foodName: otherFood.name,
        foodPartner: otherPartner._id,
        foodPartnerName: otherPartner.name,
        quantity: 2,
        totalPrice: 25.98,
        deliveryAddress: '456 User Street',
        status: 'confirmed'
      });

      const response = await request(app)
        .get('/api/v1/orders/partner')
        .set('Cookie', `accessToken=${partnerToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].foodName).toBe('Test Pizza');
    });
  });

  describe('PATCH /api/v1/orders/:id/status - Update Order Status', () => {
    let order;

    beforeEach(async () => {
      order = await orderModel.create({
        user: user._id,
        userName: user.fullName,
        food: food._id,
        foodName: food.name,
        foodPartner: foodPartner._id,
        foodPartnerName: foodPartner.name,
        quantity: 2,
        totalPrice: 31.98,
        deliveryAddress: '456 User Street',
        status: 'pending'
      });
    });

    it('should update order status to confirmed', async () => {
      const response = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order status updated');
      expect(response.body.data.status).toBe('confirmed');
    });

    it('should update order status to preparing', async () => {
      const response = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ status: 'preparing' })
        .expect(200);

      expect(response.body.data.status).toBe('preparing');
    });

    it('should update order status to ready', async () => {
      const response = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ status: 'ready' })
        .expect(200);

      expect(response.body.data.status).toBe('ready');
    });

    it('should update order status to delivered', async () => {
      const response = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ status: 'delivered' })
        .expect(200);

      expect(response.body.data.status).toBe('delivered');
    });

    it('should update order status to cancelled', async () => {
      const response = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      expect(response.body.data.status).toBe('cancelled');
    });

    it('should fail when updating delivered order', async () => {
      order.status = 'delivered';
      await order.save();

      const response = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ status: 'confirmed' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot change status of delivered orders');
    });

    it('should fail when updating cancelled order', async () => {
      order.status = 'cancelled';
      await order.save();

      const response = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ status: 'confirmed' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot change status of cancelled orders');
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail when not authenticated', async () => {
      await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .send({ status: 'confirmed' })
        .expect(401);
    });

    it('should fail when authenticated as user instead of partner', async () => {
      await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Cookie', `accessToken=${userToken}`)
        .send({ status: 'confirmed' })
        .expect(401);
    });

    it('should fail when partner tries to update another partners order', async () => {
      // Create another partner
      const otherPartner = await createTestFoodPartner({
        email: 'other-partner@test.com',
        password: 'Password123!',
        name: 'Other Restaurant',
        phone: '9876543210',
        address: '789 Other St'
      });
      const otherPartnerTokens = generateAuthTokens(otherPartner._id, 'foodPartner');

      const response = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Cookie', `accessToken=${otherPartnerTokens.accessToken}`)
        .send({ status: 'confirmed' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should fail when order does not exist', async () => {
      const response = await request(app)
        .patch('/api/v1/orders/507f1f77bcf86cd799439011/status')
        .set('Cookie', `accessToken=${partnerToken}`)
        .send({ status: 'confirmed' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });
  });
});
