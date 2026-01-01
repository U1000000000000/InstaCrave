/**
 * Global Test Setup - MongoDB Memory Server
 * Initializes in-memory MongoDB for fast, isolated testing
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  // Create in-memory MongoDB instance
  const mongod = await MongoMemoryServer.create({
    binary: {
      version: '7.0.0', // Match production MongoDB version
    },
  });

  const uri = mongod.getUri();
  
  // Store instance globally for teardown
  global.__MONGOD__ = mongod;

  // Set test environment variables
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = 'test';
  process.env.ACCESS_TOKEN_SECRET = 'test-jwt-secret-key-for-testing-only';
  
  // Reduce argon2 complexity for faster tests
  process.env.ARGON2_MEMORY_COST = '16384'; // 16MB instead of 64MB
  process.env.ARGON2_TIME_COST = '2';       // 2 iterations instead of 4
  process.env.ARGON2_PARALLELISM = '1';     // 1 thread instead of 2

  // Mock external service URLs
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.IMAGEKIT_PUBLIC_KEY = 'test-public-key';
  process.env.IMAGEKIT_PRIVATE_KEY = 'test-private-key';
  process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';

  console.log('✅ MongoDB Memory Server started:', uri);
};
