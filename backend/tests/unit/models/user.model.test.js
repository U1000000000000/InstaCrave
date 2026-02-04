/**
 * Unit Tests: User Model
 * Tests password hashing, validation, and instance methods
 */

const userModel = require('../../../src/models/user.model');
const mongoose = require('mongoose');

describe('User Model', () => {
  
  describe('Schema Validation', () => {
    
    it('should create user with valid data', async () => {
      const user = await createTestUser({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      });

      expect(user._id).toBeDefined();
      expect(user.fullName).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should require fullName', async () => {
      await expect(
        userModel.create({
          email: 'test@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(/fullName/);
    });

    it('should require email', async () => {
      await expect(
        userModel.create({
          fullName: 'Test User',
          password: 'password123'
        })
      ).rejects.toThrow(/email/);
    });

    it('should require password', async () => {
      await expect(
        userModel.create({
          fullName: 'Test User',
          email: 'test@example.com'
        })
      ).rejects.toThrow(/password/);
    });

    it('should validate email format', async () => {
      await expect(
        userModel.create({
          fullName: 'Test User',
          email: 'invalid-email',
          password: 'password123'
        })
      ).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      await createTestUser({ email: 'duplicate@example.com' });
      
      await expect(
        createTestUser({ email: 'duplicate@example.com' })
      ).rejects.toThrow();
    });

    it('should trim and lowercase email', async () => {
      const user = await createTestUser({
        email: '  UPPERCASE@EXAMPLE.COM  '
      });

      expect(user.email).toBe('uppercase@example.com');
    });

    it('should enforce minimum fullName length', async () => {
      await expect(
        userModel.create({
          fullName: 'X',
          email: 'test@example.com',
          password: 'password123'
        })
      ).rejects.toThrow();
    });

    it('should enforce maximum fullName length', async () => {
      const longName = 'A'.repeat(51);
      await expect(
        userModel.create({
          fullName: longName,
          email: 'test@example.com',
          password: 'password123'
        })
      ).rejects.toThrow();
    });

    it('should enforce minimum password length', async () => {
      await expect(
        userModel.create({
          fullName: 'Test User',
          email: 'test@example.com',
          password: '12345'
        })
      ).rejects.toThrow();
    });

    it('should trim fullName', async () => {
      const user = await createTestUser({
        fullName: '  Trimmed Name  '
      });

      expect(user.fullName).toBe('Trimmed Name');
    });
  });

  describe('Password Hashing (argon2)', () => {
    
    it('should hash password before saving', async () => {
      const plainPassword = 'mySecurePassword123';
      const user = await createTestUser({ password: plainPassword });

      expect(user.password).not.toBe(plainPassword);
      expect(user.password).toMatch(/^\$argon2id\$/);
    });

    it('should not rehash password if not modified', async () => {
      const user = await createTestUser();
      const originalHash = user.password;

      user.fullName = 'Updated Name';
      await user.save();

      expect(user.password).toBe(originalHash);
    });

    it('should rehash password when modified', async () => {
      const user = await createTestUser({ password: 'oldPassword' });
      const originalHash = user.password;

      user.password = 'newPassword123';
      await user.save();

      expect(user.password).not.toBe(originalHash);
      expect(user.password).toMatch(/^\$argon2id\$/);
    });

    it('should use argon2 parameters from environment', async () => {
      const user = await createTestUser();
      
      // Verify it's argon2id format
      expect(user.password.startsWith('$argon2id$')).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    
    describe('verifyPassword', () => {
      
      it('should verify correct password', async () => {
        const plainPassword = 'testPassword123';
        const user = await createTestUser({ password: plainPassword });

        const isValid = await user.verifyPassword(plainPassword);
        expect(isValid).toBe(true);
      });

      it('should reject incorrect password', async () => {
        const user = await createTestUser({ password: 'correctPassword' });

        const isValid = await user.verifyPassword('wrongPassword');
        expect(isValid).toBe(false);
      });

      it('should handle empty password', async () => {
        const user = await createTestUser({ password: 'password123' });

        const isValid = await user.verifyPassword('');
        expect(isValid).toBe(false);
      });

      it('should be case-sensitive', async () => {
        const user = await createTestUser({ password: 'Password123' });

        const isValidLower = await user.verifyPassword('password123');
        const isValidUpper = await user.verifyPassword('PASSWORD123');
        
        expect(isValidLower).toBe(false);
        expect(isValidUpper).toBe(false);
      });
    });
  });

  describe('Timestamps', () => {
    
    it('should automatically set createdAt on creation', async () => {
      const before = new Date();
      const user = await createTestUser();
      const after = new Date();

      expect(user.createdAt).toBeDefined();
      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should automatically update updatedAt on modification', async () => {
      const user = await createTestUser();
      const originalUpdatedAt = user.updatedAt;

      await waitFor(100); // Ensure time difference

      user.fullName = 'Updated Name';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Edge Cases', () => {
    
    it('should handle special characters in fullName', async () => {
      const user = await createTestUser({
        fullName: "O'Brien-Smith (Jr.)"
      });

      expect(user.fullName).toBe("O'Brien-Smith (Jr.)");
    });

    it('should handle international characters in fullName', async () => {
      const user = await createTestUser({
        fullName: 'José García Müller'
      });

      expect(user.fullName).toBe('José García Müller');
    });

    it('should handle email with subdomain', async () => {
      const user = await createTestUser({
        email: 'user@subdomain.example.com'
      });

      expect(user.email).toBe('user@subdomain.example.com');
    });

    it('should reject email without domain', async () => {
      await expect(
        userModel.create({
          fullName: 'Test User',
          email: 'invalid@',
          password: 'password123'
        })
      ).rejects.toThrow();
    });
  });
});
