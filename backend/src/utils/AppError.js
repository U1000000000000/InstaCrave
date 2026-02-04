// Utility error class for consistent error creation
class AppError extends Error {
  constructor(message, statusCode = 500, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
