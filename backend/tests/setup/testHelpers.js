/**
 * Test Helpers - Shared utilities for all tests
 * Provides factories, mocks, and common assertions
 */

const mongoose = require('mongoose');
const userModel = require('../../src/models/user.model');
const foodPartnerModel = require('../../src/models/foodpartner.model');
const foodModel = require('../../src/models/food.model');
const orderModel = require('../../src/models/order.model');
const tokenService = require('../../src/services/token.service');
const Session = require('../../src/models/session.model');
const cacheService = require('../../src/services/cache.service');

// Connect to database before each test file
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

// Clean up database and cache after each test
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
  // Flush cache to ensure clean state between tests
  try {
    await cacheService.flushAll();
  } catch (error) {
    // Ignore cache errors in test cleanup
    console.warn('Cache flush failed in test cleanup:', error.message);
  }
});

// Disconnect after all tests
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

/**
 * Factory: Create test user
 */
global.createTestUser = async (overrides = {}) => {
  const timestamp = Date.now();
  return await userModel.create({
    fullName: overrides.fullName || 'Test User',
    email: overrides.email || `test-user-${timestamp}@example.com`,
    password: overrides.password || 'password123',
    ...overrides
  });
};

/**
 * Factory: Create test food partner
 */
global.createTestFoodPartner = async (overrides = {}) => {
  const timestamp = Date.now();
  return await foodPartnerModel.create({
    name: overrides.name || 'Test Restaurant',
    email: overrides.email || `partner-${timestamp}@example.com`,
    password: overrides.password || 'password123',
    phone: overrides.phone || '1234567890',
    address: overrides.address || '123 Test Street, Test City',
    contactName: overrides.contactName || 'Test Contact',
    profileImage: overrides.profileImage || 'https://example.com/default.jpg',
    ...overrides
  });
};

/**
 * Factory: Create test food item
 */
global.createTestFood = async (foodPartner, overrides = {}) => {
  return await foodModel.create({
    name: overrides.name || 'Test Food Item',
    video: overrides.video || 'https://example.com/video.mp4',
    description: overrides.description || 'Delicious test food',
    foodPartner: foodPartner._id,
    isOrderable: overrides.isOrderable ?? true,
    price: overrides.price ?? 10.99,
    ...overrides
  });
};

/**
 * Factory: Create test order
 */
global.createTestOrder = async (user, foodPartner, food, overrides = {}) => {
  return await orderModel.create({
    user: user._id,
    userName: user.fullName,
    food: food._id,
    foodName: food.name,
    foodPartner: foodPartner._id,
    foodPartnerName: foodPartner.name,
    quantity: overrides.quantity || 2,
    totalPrice: overrides.totalPrice || (food.price * (overrides.quantity || 2)),
    deliveryAddress: overrides.deliveryAddress || '456 Delivery St',
    status: overrides.status || 'pending',
    ...overrides
  });
};

/**
 * Helper: Generate authentication tokens
 */
global.generateAuthTokens = (userId, role = 'user') => {
  const accessToken = tokenService.generateAccessToken({ id: userId, role });
  const refreshToken = tokenService.generateRefreshToken();
  return { accessToken, refreshToken };
};

/**
 * Helper: Create authenticated session
 */
global.createTestSession = async (userId, userType, refreshToken) => {
  const tokenHash = await tokenService.hashRefreshToken(refreshToken);
  return await Session.create({
    userId,
    userType,
    userAgent: 'Test User Agent',
    ip: '127.0.0.1',
    tokenHash
  });
};

/**
 * Helper: Wait for async operations (e.g., model hooks)
 */
global.waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock: ImageKit storage service
 */
global.mockImageKitUpload = () => {
  const storageService = require('../../src/services/storage.service');
  storageService.uploadFile = jest.fn().mockResolvedValue({
    url: 'https://ik.imagekit.io/test/mocked-upload.jpg',
    fileId: 'mock-file-id',
    name: 'mocked-upload.jpg'
  });
  return storageService;
};

/**
 * Helper: Extract cookies from supertest response
 */
global.extractCookie = (response, cookieName) => {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return null;
  
  const cookie = cookies.find(c => c.startsWith(cookieName));
  if (!cookie) return null;
  
  return cookie.split(';')[0];
};

/**
 * Helper: Extract CSRF token from response
 */
global.extractCsrfToken = (response) => {
  return response.body?.csrfToken || null;
};

console.log('✅ Test helpers loaded');

// Export all helpers for explicit imports (in addition to global assignment)
module.exports = {
  createTestUser: global.createTestUser,
  createTestFoodPartner: global.createTestFoodPartner,
  createTestFood: global.createTestFood,
  createTestOrder: global.createTestOrder,
  generateAuthTokens: global.generateAuthTokens,
  createTestSession: global.createTestSession,
  mockImageKitUpload: global.mockImageKitUpload,
  waitFor: global.waitFor,
  extractCookie: global.extractCookie,
  extractCsrfToken: global.extractCsrfToken
};
