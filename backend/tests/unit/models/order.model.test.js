/**
 * Unit Tests: Order Model
 * Tests order validation, status management, and relationships
 */

const orderModel = require('../../../src/models/order.model');

describe('Order Model', () => {
  
  let testUser, testPartner, testFood;

  beforeEach(async () => {
    testUser = await createTestUser();
    testPartner = await createTestFoodPartner();
    testFood = await createTestFood(testPartner, {
      isOrderable: true,
      price: 10.00
    });
  });

  describe('Schema Validation', () => {
    
    it('should create order with valid data', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood, {
        quantity: 3,
        totalPrice: 30.00,
        deliveryAddress: '789 Delivery Lane'
      });

      expect(order._id).toBeDefined();
      expect(order.user.toString()).toBe(testUser._id.toString());
      expect(order.foodPartner.toString()).toBe(testPartner._id.toString());
      expect(order.food.toString()).toBe(testFood._id.toString());
      expect(order.quantity).toBe(3);
      expect(order.totalPrice).toBe(30.00);
      expect(order.status).toBe('pending');
    });

    it('should require foodName', async () => {
      await expect(
        orderModel.create({
          foodPartnerName: 'Partner',
          foodPartner: testPartner._id,
          userName: 'User',
          user: testUser._id,
          food: testFood._id,
          quantity: 1,
          totalPrice: 10,
          deliveryAddress: '123 St'
        })
      ).rejects.toThrow(/foodName/);
    });

    it('should require foodPartnerName', async () => {
      await expect(
        orderModel.create({
          foodName: 'Food',
          foodPartner: testPartner._id,
          userName: 'User',
          user: testUser._id,
          food: testFood._id,
          quantity: 1,
          totalPrice: 10,
          deliveryAddress: '123 St'
        })
      ).rejects.toThrow(/foodPartnerName/);
    });

    it('should require userName', async () => {
      await expect(
        orderModel.create({
          foodName: 'Food',
          foodPartnerName: 'Partner',
          foodPartner: testPartner._id,
          user: testUser._id,
          food: testFood._id,
          quantity: 1,
          totalPrice: 10,
          deliveryAddress: '123 St'
        })
      ).rejects.toThrow(/userName/);
    });

    it('should require quantity', async () => {
      await expect(
        orderModel.create({
          foodName: 'Food',
          foodPartnerName: 'Partner',
          foodPartner: testPartner._id,
          userName: 'User',
          user: testUser._id,
          food: testFood._id,
          totalPrice: 10,
          deliveryAddress: '123 St'
        })
      ).rejects.toThrow(/quantity/);
    });

    it('should require totalPrice', async () => {
      await expect(
        orderModel.create({
          foodName: 'Food',
          foodPartnerName: 'Partner',
          foodPartner: testPartner._id,
          userName: 'User',
          user: testUser._id,
          food: testFood._id,
          quantity: 1,
          deliveryAddress: '123 St'
        })
      ).rejects.toThrow(/totalPrice/);
    });

    it('should require deliveryAddress', async () => {
      await expect(
        orderModel.create({
          foodName: 'Food',
          foodPartnerName: 'Partner',
          foodPartner: testPartner._id,
          userName: 'User',
          user: testUser._id,
          food: testFood._id,
          quantity: 1,
          totalPrice: 10
        })
      ).rejects.toThrow(/deliveryAddress/);
    });

    it('should enforce minimum quantity of 1', async () => {
      await expect(
        createTestOrder(testUser, testPartner, testFood, {
          quantity: 0
        })
      ).rejects.toThrow();
    });

    it('should not allow negative totalPrice', async () => {
      await expect(
        createTestOrder(testUser, testPartner, testFood, {
          totalPrice: -10
        })
      ).rejects.toThrow();
    });
  });

  describe('Order Status', () => {
    
    it('should default status to pending', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood);
      expect(order.status).toBe('pending');
    });

    it('should accept valid status: confirmed', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood, {
        status: 'confirmed'
      });

      expect(order.status).toBe('confirmed');
    });

    it('should accept valid status: preparing', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood, {
        status: 'preparing'
      });

      expect(order.status).toBe('preparing');
    });

    it('should accept valid status: ready', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood, {
        status: 'ready'
      });

      expect(order.status).toBe('ready');
    });

    it('should accept valid status: delivered', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood, {
        status: 'delivered'
      });

      expect(order.status).toBe('delivered');
    });

    it('should accept valid status: cancelled', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood, {
        status: 'cancelled'
      });

      expect(order.status).toBe('cancelled');
    });

    it('should reject invalid status', async () => {
      const order = createTestOrder(testUser, testPartner, testFood);
      
      await expect(
        orderModel.create({
          foodName: testFood.name,
          foodPartnerName: testPartner.name,
          foodPartner: testPartner._id,
          userName: testUser.fullName,
          user: testUser._id,
          food: testFood._id,
          quantity: 1,
          totalPrice: 10,
          deliveryAddress: '123 St',
          status: 'invalid-status'
        })
      ).rejects.toThrow();
    });

    it('should allow updating status', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood);
      expect(order.status).toBe('pending');

      order.status = 'confirmed';
      await order.save();

      expect(order.status).toBe('confirmed');
    });
  });

  describe('Relationships', () => {
    
    it('should populate user correctly', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood);
      const populated = await orderModel.findById(order._id).populate('user');

      expect(populated.user._id.toString()).toBe(testUser._id.toString());
      expect(populated.user.fullName).toBe(testUser.fullName);
    });

    it('should populate foodPartner correctly', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood);
      const populated = await orderModel.findById(order._id).populate('foodPartner');

      expect(populated.foodPartner._id.toString()).toBe(testPartner._id.toString());
      expect(populated.foodPartner.name).toBe(testPartner.name);
    });

    it('should populate food correctly', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood);
      const populated = await orderModel.findById(order._id).populate('food');

      expect(populated.food._id.toString()).toBe(testFood._id.toString());
      expect(populated.food.name).toBe(testFood.name);
    });

    it('should populate all relationships at once', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood);
      const populated = await orderModel.findById(order._id)
        .populate('user')
        .populate('foodPartner')
        .populate('food');

      expect(populated.user).toBeDefined();
      expect(populated.foodPartner).toBeDefined();
      expect(populated.food).toBeDefined();
    });
  });

  describe('String Fields', () => {
    
    it('should trim foodName', async () => {
      const order = await orderModel.create({
        foodName: '  Pizza  ',
        foodPartnerName: 'Partner',
        foodPartner: testPartner._id,
        userName: 'User',
        user: testUser._id,
        food: testFood._id,
        quantity: 1,
        totalPrice: 10,
        deliveryAddress: '123 St'
      });

      expect(order.foodName).toBe('Pizza');
    });

    it('should trim deliveryAddress', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood, {
        deliveryAddress: '  123 Main St  '
      });

      expect(order.deliveryAddress).toBe('123 Main St');
    });

    it('should enforce maximum deliveryAddress length', async () => {
      const longAddress = 'A'.repeat(201);
      await expect(
        createTestOrder(testUser, testPartner, testFood, {
          deliveryAddress: longAddress
        })
      ).rejects.toThrow();
    });
  });

  describe('Timestamps', () => {
    
    it('should set createdAt on order creation', async () => {
      const before = new Date();
      const order = await createTestOrder(testUser, testPartner, testFood);
      const after = new Date();

      expect(order.createdAt).toBeDefined();
      expect(order.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(order.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood);
      const originalUpdatedAt = order.updatedAt;

      await waitFor(100);

      order.status = 'confirmed';
      await order.save();

      expect(order.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Edge Cases', () => {
    
    it('should handle large quantities', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood, {
        quantity: 100,
        totalPrice: 1000.00
      });

      expect(order.quantity).toBe(100);
    });

    it('should handle decimal totalPrice', async () => {
      const order = await createTestOrder(testUser, testPartner, testFood, {
        totalPrice: 12.99
      });

      expect(order.totalPrice).toBe(12.99);
    });

    it('should handle long delivery addresses', async () => {
      const longAddress = 'Apartment 456, Building 7, Street Name That Is Very Long, District, City, State, Postal Code 12345';
      const order = await createTestOrder(testUser, testPartner, testFood, {
        deliveryAddress: longAddress
      });

      expect(order.deliveryAddress).toBe(longAddress);
    });
  });
});
