
const mongoose = require("mongoose");

const argon2 = require('argon2');

const foodPartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  contactName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^\+?\d{10,15}$/, 'Please use a valid phone number.']
  },
  address: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  profileImage: {
    type: String,
    default: "https://ik.imagekit.io/u1000/Food%20Vector%20Icon.svg?updatedAt=1759741838210",
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  followCount: {
    type: Number,
    default: 0,
    min: 0
  }, 

}, { 
  timestamps: true
});



/**
 * Hash password before saving (only if modified)
 * Uses env vars: ARGON2_MEMORY_COST, ARGON2_TIME_COST, ARGON2_PARALLELISM
 * Secure defaults: memoryCost=65536, timeCost=4, parallelism=2
 * Tune these in .env for security/performance tradeoff.
 */
foodPartnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const memoryCost = parseInt(process.env.ARGON2_MEMORY_COST, 10) || 65536;
    const timeCost = parseInt(process.env.ARGON2_TIME_COST, 10) || 4;
    const parallelism = parseInt(process.env.ARGON2_PARALLELISM, 10) || 2;
    this.password = await argon2.hash(this.password, {
      type: argon2.argon2id,
      memoryCost,
      timeCost,
      parallelism,
    });
    next();
  } catch (err) {
    next(err);
  }
});

// Method to verify password
foodPartnerSchema.methods.verifyPassword = async function (plainPassword) {
  return await argon2.verify(this.password, plainPassword);
};

const foodPartnerModel = mongoose.model("foodpartner", foodPartnerSchema);

module.exports = foodPartnerModel;
