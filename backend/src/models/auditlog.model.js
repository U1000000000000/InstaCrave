const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  event: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'userType', required: false },
  userType: { type: String, enum: ['User', 'FoodPartner'], required: false },
  userAgent: { type: String },
  ip: { type: String },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: false },
  details: { type: Object },
}, {
  strict: false,
  versionKey: false,
  collection: 'audit_logs',
});

auditLogSchema.index({ event: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
