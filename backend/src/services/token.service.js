const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const argon2 = require('argon2');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
const REFRESH_TOKEN_BYTE_LENGTH = 64;


// Generate JWT access token
function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

// Generate secure random refresh token (not a JWT)
function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTE_LENGTH).toString('hex');
}



/**
 * Hash refresh token for storage (argon2)
 * Uses env vars: ARGON2_MEMORY_COST, ARGON2_TIME_COST, ARGON2_PARALLELISM
 * Secure defaults: memoryCost=65536, timeCost=4, parallelism=2
 */
async function hashRefreshToken(token) {
  const memoryCost = parseInt(process.env.ARGON2_MEMORY_COST, 10) || 65536;
  const timeCost = parseInt(process.env.ARGON2_TIME_COST, 10) || 4;
  const parallelism = parseInt(process.env.ARGON2_PARALLELISM, 10) || 2;
  return await argon2.hash(token, {
    type: argon2.argon2id,
    memoryCost,
    timeCost,
    parallelism,
  });
}

// Compare refresh token with hash (argon2)
async function compareRefreshToken(token, hash) {
  return await argon2.verify(hash, token);
}

// Verify JWT access token
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  compareRefreshToken,
  verifyAccessToken,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN
};
