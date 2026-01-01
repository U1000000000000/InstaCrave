const handleServiceError = require('../../../src/utils/serviceError');
const AppError = require('../../../src/utils/AppError');

describe('Service Error Handler', () => {
  it('should throw AppError with error message', () => {
    const error = new Error('Something went wrong');
    
    expect(() => {
      handleServiceError(error);
    }).toThrow(AppError);
    
    expect(() => {
      handleServiceError(error);
    }).toThrow('Something went wrong');
  });

  it('should throw AppError with context prepended', () => {
    const error = new Error('Database connection failed');
    
    expect(() => {
      handleServiceError(error, 'User Service');
    }).toThrow('User Service: Database connection failed');
  });

  it('should use error statusCode if provided', () => {
    const error = new AppError('Not found', 404);
    
    try {
      handleServiceError(error);
    } catch (err) {
      expect(err.statusCode).toBe(404);
    }
  });

  it('should default to statusCode 500 if not provided', () => {
    const error = new Error('Generic error');
    
    try {
      handleServiceError(error);
    } catch (err) {
      expect(err.statusCode).toBe(500);
    }
  });

  it('should handle errors without context', () => {
    const error = new Error('Test error');
    
    try {
      handleServiceError(error, '');
    } catch (err) {
      expect(err.message).toBe('Test error');
      expect(err.message).not.toContain(':');
    }
  });
});
