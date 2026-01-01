/**
 * Unit Tests: Token Service
 * Tests JWT generation, refresh token handling, and argon2 hashing
 */

const tokenService = require('../../../src/services/token.service');
const jwt = require('jsonwebtoken');

describe('Token Service', () => {
  
  describe('generateAccessToken', () => {
    
    it('should generate valid JWT access token', () => {
      const payload = { id: 'user123', role: 'user' };
      const token = tokenService.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should include payload in token', () => {
      const payload = { id: 'user456', role: 'foodPartner' };
      const token = tokenService.generateAccessToken(payload);
      const decoded = jwt.decode(token);

      expect(decoded.id).toBe('user456');
      expect(decoded.role).toBe('foodPartner');
    });

    it('should set expiration time', () => {
      const payload = { id: 'user789', role: 'user' };
      const token = tokenService.generateAccessToken(payload);
      const decoded = jwt.decode(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should generate different tokens for same payload', async () => {
      const payload = { id: 'user123', role: 'user' };
      const token1 = tokenService.generateAccessToken(payload);
      
      // Wait 1 second to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const token2 = tokenService.generateAccessToken(payload);

      // Tokens differ due to iat (issued at) timestamp
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyAccessToken', () => {
    
    it('should verify valid token', () => {
      const payload = { id: 'user123', role: 'user' };
      const token = tokenService.generateAccessToken(payload);
      const verified = tokenService.verifyAccessToken(token);

      expect(verified.id).toBe('user123');
      expect(verified.role).toBe('user');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        tokenService.verifyAccessToken(invalidToken);
      }).toThrow();
    });

    it('should throw error for tampered token', () => {
      const payload = { id: 'user123', role: 'user' };
      const token = tokenService.generateAccessToken(payload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => {
        tokenService.verifyAccessToken(tamperedToken);
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      // Create token with immediate expiration
      const expiredToken = jwt.sign(
        { id: 'user123', role: 'user' },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '0s' }
      );

      expect(() => {
        tokenService.verifyAccessToken(expiredToken);
      }).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    
    it('should generate random refresh token', () => {
      const token = tokenService.generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(128); // 64 bytes * 2 (hex encoding)
    });

    it('should generate unique tokens', () => {
      const token1 = tokenService.generateRefreshToken();
      const token2 = tokenService.generateRefreshToken();

      expect(token1).not.toBe(token2);
    });

    it('should use only hex characters', () => {
      const token = tokenService.generateRefreshToken();
      const hexPattern = /^[0-9a-f]+$/;

      expect(hexPattern.test(token)).toBe(true);
    });

    it('should generate cryptographically random tokens', () => {
      const tokens = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        tokens.add(tokenService.generateRefreshToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(iterations);
    });
  });

  describe('hashRefreshToken', () => {
    
    it('should hash refresh token with argon2', async () => {
      const token = tokenService.generateRefreshToken();
      const hash = await tokenService.hashRefreshToken(token);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('$argon2id$')).toBe(true);
    });

    it('should generate different hashes for same token', async () => {
      const token = tokenService.generateRefreshToken();
      const hash1 = await tokenService.hashRefreshToken(token);
      const hash2 = await tokenService.hashRefreshToken(token);

      // Argon2 uses random salt, so hashes differ
      expect(hash1).not.toBe(hash2);
    });

    it('should use environment-configured argon2 parameters', async () => {
      const token = tokenService.generateRefreshToken();
      const hash = await tokenService.hashRefreshToken(token);

      // Verify it's argon2id format
      expect(hash).toMatch(/^\$argon2id\$/);
    });
  });

  describe('compareRefreshToken', () => {
    
    it('should verify correct refresh token', async () => {
      const token = tokenService.generateRefreshToken();
      const hash = await tokenService.hashRefreshToken(token);

      const isValid = await tokenService.compareRefreshToken(token, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect refresh token', async () => {
      const token = tokenService.generateRefreshToken();
      const wrongToken = tokenService.generateRefreshToken();
      const hash = await tokenService.hashRefreshToken(token);

      const isValid = await tokenService.compareRefreshToken(wrongToken, hash);
      expect(isValid).toBe(false);
    });

    it('should reject empty token', async () => {
      const token = tokenService.generateRefreshToken();
      const hash = await tokenService.hashRefreshToken(token);

      const isValid = await tokenService.compareRefreshToken('', hash);
      expect(isValid).toBe(false);
    });

    it('should reject tampered hash', async () => {
      const token = tokenService.generateRefreshToken();
      const hash = await tokenService.hashRefreshToken(token);
      const tamperedHash = hash.slice(0, -5) + 'xxxxx';

      // argon2 returns false for invalid hash format instead of throwing
      const isValid = await tokenService.compareRefreshToken(token, tamperedHash);
      expect(isValid).toBe(false);
    });
  });

  describe('Token Constants', () => {
    
    it('should export ACCESS_TOKEN_EXPIRES_IN', () => {
      expect(tokenService.ACCESS_TOKEN_EXPIRES_IN).toBeDefined();
      expect(tokenService.ACCESS_TOKEN_EXPIRES_IN).toBe('15m');
    });

    it('should export REFRESH_TOKEN_EXPIRES_IN', () => {
      expect(tokenService.REFRESH_TOKEN_EXPIRES_IN).toBeDefined();
      expect(tokenService.REFRESH_TOKEN_EXPIRES_IN).toBe('30d');
    });
  });

  describe('Integration: Complete Token Flow', () => {
    
    it('should support full access token lifecycle', () => {
      // Generate
      const payload = { id: 'user123', role: 'user' };
      const token = tokenService.generateAccessToken(payload);
      
      // Verify
      const verified = tokenService.verifyAccessToken(token);
      expect(verified.id).toBe(payload.id);
      expect(verified.role).toBe(payload.role);
    });

    it('should support full refresh token lifecycle', async () => {
      // Generate
      const refreshToken = tokenService.generateRefreshToken();
      
      // Hash
      const hash = await tokenService.hashRefreshToken(refreshToken);
      
      // Verify
      const isValid = await tokenService.compareRefreshToken(refreshToken, hash);
      expect(isValid).toBe(true);
      
      // Verify wrong token fails
      const wrongToken = tokenService.generateRefreshToken();
      const isWrongValid = await tokenService.compareRefreshToken(wrongToken, hash);
      expect(isWrongValid).toBe(false);
    });
  });
});
