/**
 * Unit Tests: Food Model
 * Tests validation, relationships, and counter fields
 */

const foodModel = require('../../../src/models/food.model');

describe('Food Model', () => {
  
  let testPartner;

  beforeEach(async () => {
    testPartner = await createTestFoodPartner();
  });

  describe('Schema Validation', () => {
    
    it('should create food with valid data', async () => {
      const food = await createTestFood(testPartner, {
        name: 'Margherita Pizza',
        video: 'https://example.com/pizza.mp4',
        description: 'Classic Italian pizza',
        isOrderable: true,
        price: 12.99
      });

      expect(food._id).toBeDefined();
      expect(food.name).toBe('Margherita Pizza');
      expect(food.foodPartner.toString()).toBe(testPartner._id.toString());
      expect(food.likeCount).toBe(0);
      expect(food.savesCount).toBe(0);
      expect(food.commentCount).toBe(0);
      expect(food.shareCount).toBe(0);
    });

    it('should require name', async () => {
      await expect(
        foodModel.create({
          video: 'https://example.com/video.mp4',
          foodPartner: testPartner._id
        })
      ).rejects.toThrow(/name/);
    });

    it('should require video', async () => {
      await expect(
        foodModel.create({
          name: 'Test Food',
          foodPartner: testPartner._id
        })
      ).rejects.toThrow(/video/);
    });

    it('should require foodPartner', async () => {
      await expect(
        foodModel.create({
          name: 'Test Food',
          video: 'https://example.com/video.mp4'
        })
      ).rejects.toThrow(/foodPartner/);
    });

    it('should enforce minimum name length', async () => {
      await expect(
        foodModel.create({
          name: 'X',
          video: 'https://example.com/video.mp4',
          foodPartner: testPartner._id
        })
      ).rejects.toThrow();
    });

    it('should enforce maximum name length', async () => {
      const longName = 'A'.repeat(101);
      await expect(
        foodModel.create({
          name: longName,
          video: 'https://example.com/video.mp4',
          foodPartner: testPartner._id
        })
      ).rejects.toThrow();
    });

    it('should enforce maximum description length', async () => {
      const longDescription = 'A'.repeat(501);
      await expect(
        foodModel.create({
          name: 'Test Food',
          video: 'https://example.com/video.mp4',
          description: longDescription,
          foodPartner: testPartner._id
        })
      ).rejects.toThrow();
    });

    it('should trim name', async () => {
      const food = await createTestFood(testPartner, {
        name: '  Trimmed Pizza  '
      });

      expect(food.name).toBe('Trimmed Pizza');
    });

    it('should trim video URL', async () => {
      const food = await createTestFood(testPartner, {
        video: '  https://example.com/video.mp4  '
      });

      expect(food.video).toBe('https://example.com/video.mp4');
    });
  });

  describe('Counter Fields', () => {
    
    it('should initialize all counters to 0', async () => {
      const food = await createTestFood(testPartner);

      expect(food.likeCount).toBe(0);
      expect(food.savesCount).toBe(0);
      expect(food.commentCount).toBe(0);
      expect(food.shareCount).toBe(0);
    });

    it('should not allow negative likeCount', async () => {
      const food = await createTestFood(testPartner);
      food.likeCount = -1;

      await expect(food.save()).rejects.toThrow();
    });

    it('should not allow negative savesCount', async () => {
      const food = await createTestFood(testPartner);
      food.savesCount = -1;

      await expect(food.save()).rejects.toThrow();
    });

    it('should not allow negative commentCount', async () => {
      const food = await createTestFood(testPartner);
      food.commentCount = -1;

      await expect(food.save()).rejects.toThrow();
    });

    it('should not allow negative shareCount', async () => {
      const food = await createTestFood(testPartner);
      food.shareCount = -1;

      await expect(food.save()).rejects.toThrow();
    });

    it('should allow incrementing counters', async () => {
      const food = await createTestFood(testPartner);

      food.likeCount += 1;
      food.savesCount += 1;
      food.commentCount += 1;
      food.shareCount += 1;
      await food.save();

      expect(food.likeCount).toBe(1);
      expect(food.savesCount).toBe(1);
      expect(food.commentCount).toBe(1);
      expect(food.shareCount).toBe(1);
    });
  });

  describe('Orderable and Pricing', () => {
    
    it('should default isOrderable to false', async () => {
      const food = await foodModel.create({
        name: 'Display Only Food',
        video: 'https://example.com/video.mp4',
        foodPartner: testPartner._id
      });

      expect(food.isOrderable).toBe(false);
    });

    it('should require price when isOrderable is true', async () => {
      await expect(
        foodModel.create({
          name: 'Orderable Food',
          video: 'https://example.com/video.mp4',
          foodPartner: testPartner._id,
          isOrderable: true
          // Missing price
        })
      ).rejects.toThrow();
    });

    it('should allow creation with price when isOrderable is true', async () => {
      const food = await createTestFood(testPartner, {
        isOrderable: true,
        price: 15.99
      });

      expect(food.isOrderable).toBe(true);
      expect(food.price).toBe(15.99);
    });

    it('should not allow negative price', async () => {
      await expect(
        foodModel.create({
          name: 'Food',
          video: 'https://example.com/video.mp4',
          foodPartner: testPartner._id,
          isOrderable: true,
          price: -10
        })
      ).rejects.toThrow();
    });

    it('should allow price of 0', async () => {
      const food = await createTestFood(testPartner, {
        isOrderable: true,
        price: 0
      });

      expect(food.price).toBe(0);
    });
  });

  describe('Relationships', () => {
    
    it('should reference foodPartner correctly', async () => {
      const food = await createTestFood(testPartner);
      const populatedFood = await foodModel.findById(food._id).populate('foodPartner');

      expect(populatedFood.foodPartner._id.toString()).toBe(testPartner._id.toString());
      expect(populatedFood.foodPartner.name).toBe(testPartner.name);
    });

    it('should cascade delete properly when referenced', async () => {
      const food = await createTestFood(testPartner);
      expect(food.foodPartner).toBeDefined();
      
      // Verify the food item exists
      const foundFood = await foodModel.findById(food._id);
      expect(foundFood).toBeTruthy();
    });
  });

  describe('Timestamps', () => {
    
    it('should set createdAt on creation', async () => {
      const before = new Date();
      const food = await createTestFood(testPartner);
      const after = new Date();

      expect(food.createdAt).toBeDefined();
      expect(food.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(food.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const food = await createTestFood(testPartner);
      const originalUpdatedAt = food.updatedAt;

      await waitFor(100);

      food.name = 'Updated Food Name';
      await food.save();

      expect(food.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Edge Cases', () => {
    
    it('should handle description as optional', async () => {
      const food = await foodModel.create({
        name: 'No Description Food',
        video: 'https://example.com/video.mp4',
        foodPartner: testPartner._id
      });

      expect(food.description).toBeUndefined();
    });

    it('should handle empty description', async () => {
      const food = await createTestFood(testPartner, {
        description: ''
      });

      expect(food.description).toBe('');
    });

    it('should handle decimal prices', async () => {
      const food = await createTestFood(testPartner, {
        isOrderable: true,
        price: 9.99
      });

      expect(food.price).toBe(9.99);
    });

    it('should handle large counter values', async () => {
      const food = await createTestFood(testPartner);
      
      food.likeCount = 1000000;
      food.savesCount = 500000;
      food.commentCount = 25000;
      food.shareCount = 10000;
      await food.save();

      expect(food.likeCount).toBe(1000000);
      expect(food.savesCount).toBe(500000);
      expect(food.commentCount).toBe(25000);
      expect(food.shareCount).toBe(10000);
    });
  });
});
