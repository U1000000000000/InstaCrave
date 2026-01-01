const sanitizeHtml = require('sanitize-html');

// Use in Joi custom() for sanitization
module.exports = (value) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
