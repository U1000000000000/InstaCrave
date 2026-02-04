const crypto = require('crypto');

function uuidv4() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older Node versions: RFC 4122 v4
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

module.exports = {
  uuidv4,
};
