const csrf = require('csurf');

// CSRF protection middleware using cookies (disabled in test environment)
const csrfProtection = process.env.NODE_ENV === 'test' 
  ? (req, res, next) => next() // Bypass CSRF in tests
  : csrf({
      cookie: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    });

module.exports = csrfProtection;
