// Utility to wrap async route handlers and pass errors to Express error middleware
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
