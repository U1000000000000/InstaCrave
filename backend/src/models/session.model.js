const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'userType', required: true },
  userType: { type: String, enum: ['User', 'FoodPartner'], required: true },
  userAgent: { type: String },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  tokenHash: { type: String, required: true },
});

module.exports = mongoose.model('Session', sessionSchema);
