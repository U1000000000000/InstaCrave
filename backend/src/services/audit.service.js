const AuditLog = require('../models/auditlog.model');

async function logEvent(event, details = {}) {
  try {
    // Extract common fields for audit log
    const {
      userId,
      userType,
      userAgent,
      ip,
      sessionId,
      ...rest
    } = details;
    await AuditLog.create({
      event,
      userId,
      userType,
      userAgent,
      ip,
      sessionId,
      details: rest && Object.keys(rest).length > 0 ? rest : undefined,
    });
  } catch (err) {
    const AppError = require('../utils/AppError');
    throw new AppError('Audit log DB error: ' + err.message, 500);
  }
}

module.exports = { logEvent };
