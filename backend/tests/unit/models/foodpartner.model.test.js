/**
 * Unit Tests: Food Partner Model
 * Tests password hashing, validation, and business logic
 */

const foodPartnerModel = require('../../../src/models/foodpartner.model');

describe('Food Partner Model', () => {
  
  describe('Schema Validation', () => {
    
    it('should create food partner with valid data', async () => {
      const partner = await createTestFoodPartner({
        name: 'Pizza Palace',
        email: 'pizza@example.com',
        password: 'password123',
        phone: '+1234567890',
        address: '123 Main St',
        contactName: 'John Manager'
      });

      expect(partner._id).toBeDefined();
      expect(partner.name).toBe('Pizza Palace');
      expect(partner.email).toBe('pizza@example.com');
      expect(partner.phone).toBe('+1234567890');
      expect(partner.followCount).toBe(0);
    });

    it('should require name', async () => {
      await expect(
        foodPartnerModel.create({
          email: 'test@example.com',
          password: 'password123',
          phone: '1234567890',
          address: '123 Main St',
          contactName: 'Contact'
        })
      ).rejects.toThrow(/name/);
    });

    it('should require contactName', async () => {
      await expect(
        foodPartnerModel.create({
          name: 'Restaurant',
          email: 'test@example.com',
          password: 'password123',
          phone: '1234567890',
          address: '123 Main St'
        })
      ).rejects.toThrow(/contactName/);
    });

    it('should require phone', async () => {
      await expect(
        foodPartnerModel.create({
          name: 'Restaurant',
          email: 'test@example.com',
          password: 'password123',
          address: '123 Main St',
          contactName: 'Contact'
        })
      ).rejects.toThrow(/phone/);
    });

    it('should require address', async () => {
      await expect(
        foodPartnerModel.create({
          name: 'Restaurant',
          email: 'test@example.com',
          password: 'password123',
          phone: '1234567890',
          contactName: 'Contact'
        })
      ).rejects.toThrow(/address/);
    });

    it('should validate phone format', async () => {
      await expect(
        foodPartnerModel.create({
          name: 'Restaurant',
          email: 'test@example.com',
          password: 'password123',
          phone: 'invalid-phone',
          address: '123 Main St',
          contactName: 'Contact'
        })
      ).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      await createTestFoodPartner({ email: 'unique@example.com' });
      
      await expect(
        createTestFoodPartner({ email: 'unique@example.com' })
      ).rejects.toThrow();
    });

    it('should set default profileImage', async () => {
      const partner = await createTestFoodPartner();
      expect(partner.profileImage).toBeDefined();
      expect(typeof partner.profileImage).toBe('string');
    });

    it('should initialize followCount to 0', async () => {
      const partner = await createTestFoodPartner();
      expect(partner.followCount).toBe(0);
    });

    it('should trim name', async () => {
      const partner = await createTestFoodPartner({
        name: '  Trimmed Restaurant  '
      });

      expect(partner.name).toBe('Trimmed Restaurant');
    });

    it('should enforce minimum name length', async () => {
      await expect(
        foodPartnerModel.create({
          name: 'X',
          email: 'test@example.com',
          password: 'password123',
          phone: '1234567890',
          address: '123 Main St',
          contactName: 'Contact'
        })
      ).rejects.toThrow();
    });

    it('should enforce maximum name length', async () => {
      const longName = 'A'.repeat(101);
      await expect(
        foodPartnerModel.create({
          name: longName,
          email: 'test@example.com',
          password: 'password123',
          phone: '1234567890',
          address: '123 Main St',
          contactName: 'Contact'
        })
      ).rejects.toThrow();
    });
  });

  describe('Password Hashing (argon2)', () => {
    
    it('should hash password before saving', async () => {
      const plainPassword = 'partnerPassword123';
      const partner = await createTestFoodPartner({ password: plainPassword });

      expect(partner.password).not.toBe(plainPassword);
      expect(partner.password).toMatch(/^\$argon2id\$/);
    });

    it('should not rehash password if not modified', async () => {
      const partner = await createTestFoodPartner();
      const originalHash = partner.password;

      partner.name = 'Updated Restaurant Name';
      await partner.save();

      expect(partner.password).toBe(originalHash);
    });

    it('should rehash password when modified', async () => {
      const partner = await createTestFoodPartner({ password: 'oldPassword' });
      const originalHash = partner.password;

      partner.password = 'newSecurePassword';
      await partner.save();

      expect(partner.password).not.toBe(originalHash);
      expect(partner.password).toMatch(/^\$argon2id\$/);
    });
  });

  describe('Instance Methods', () => {
    
    describe('verifyPassword', () => {
      
      it('should verify correct password', async () => {
        const plainPassword = 'partnerPass123';
        const partner = await createTestFoodPartner({ password: plainPassword });

        const isValid = await partner.verifyPassword(plainPassword);
        expect(isValid).toBe(true);
      });

      it('should reject incorrect password', async () => {
        const partner = await createTestFoodPartner({ password: 'correctPass' });

        const isValid = await partner.verifyPassword('wrongPass');
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Follow Count Management', () => {
    
    it('should allow incrementing followCount', async () => {
      const partner = await createTestFoodPartner();
      expect(partner.followCount).toBe(0);

      partner.followCount += 1;
      await partner.save();

      expect(partner.followCount).toBe(1);
    });

    it('should allow decrementing followCount', async () => {
      const partner = await createTestFoodPartner({ followCount: 5 });
      
      partner.followCount -= 1;
      await partner.save();

      expect(partner.followCount).toBe(4);
    });

    it('should not allow negative followCount', async () => {
      const partner = await createTestFoodPartner({ followCount: 0 });
      
      partner.followCount = -1;
      
      await expect(partner.save()).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    
    it('should handle international phone numbers', async () => {
      const partner = await createTestFoodPartner({
        phone: '+441234567890'
      });

      expect(partner.phone).toBe('+441234567890');
    });

    it('should handle long addresses', async () => {
      const longAddress = '123 Very Long Street Name, Suite 456, Building C, Floor 7, Downtown District, Major City, State 12345';
      const partner = await createTestFoodPartner({
        address: longAddress
      });

      expect(partner.address).toBe(longAddress);
    });

    it('should enforce maximum address length', async () => {
      const tooLongAddress = 'A'.repeat(201);
      await expect(
        foodPartnerModel.create({
          name: 'Restaurant',
          email: 'test@example.com',
          password: 'password123',
          phone: '1234567890',
          address: tooLongAddress,
          contactName: 'Contact'
        })
      ).rejects.toThrow();
    });
  });

  describe('Timestamps', () => {
    
    it('should set createdAt and updatedAt on creation', async () => {
      const partner = await createTestFoodPartner();

      expect(partner.createdAt).toBeDefined();
      expect(partner.updatedAt).toBeDefined();
      expect(partner.createdAt.getTime()).toBeLessThanOrEqual(partner.updatedAt.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const partner = await createTestFoodPartner();
      const originalUpdatedAt = partner.updatedAt;

      await waitFor(100);

      partner.name = 'Updated Name';
      await partner.save();

      expect(partner.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
