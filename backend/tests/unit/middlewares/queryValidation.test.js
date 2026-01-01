const queryValidation = require('../../../src/middlewares/queryValidation.middleware');
const queryValidationSchema = require('../../../src/validation/query.validation');
const AppError = require('../../../src/utils/AppError');

// Mock the validation schema
jest.mock('../../../src/validation/query.validation');

describe('Query Validation Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      query: {}
    };
    
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('Valid Query Parameters', () => {
    it('should pass validation with valid parameters', () => {
      mockReq.query = { page: '1', limit: '10' };
      
      queryValidationSchema.validate.mockReturnValue({ error: null });
      
      queryValidation(mockReq, mockRes, mockNext);
      
      expect(queryValidationSchema.validate).toHaveBeenCalledWith(mockReq.query);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass validation with empty query', () => {
      mockReq.query = {};
      
      queryValidationSchema.validate.mockReturnValue({ error: null });
      
      queryValidation(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate all query fields', () => {
      mockReq.query = {
        page: '1',
        limit: '20',
        sort: 'createdAt',
        order: 'desc'
      };
      
      queryValidationSchema.validate.mockReturnValue({ error: null });
      
      queryValidation(mockReq, mockRes, mockNext);
      
      expect(queryValidationSchema.validate).toHaveBeenCalledWith(mockReq.query);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Invalid Query Parameters', () => {
    it('should fail validation with invalid parameters', () => {
      mockReq.query = { page: 'invalid', limit: 'bad' };
      
      const mockError = {
        details: [
          { message: '"page" must be a number' },
          { message: '"limit" must be a number' }
        ]
      };
      
      queryValidationSchema.validate.mockReturnValue({ error: mockError });
      
      queryValidation(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid query parameters',
          statusCode: 400
        })
      );
    });

    it('should create AppError with validation details', () => {
      mockReq.query = { page: '-1' };
      
      const mockError = {
        details: [
          { message: '"page" must be greater than or equal to 1' }
        ]
      };
      
      queryValidationSchema.validate.mockReturnValue({ error: mockError });
      
      queryValidation(mockReq, mockRes, mockNext);
      
      const errorArg = mockNext.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Invalid query parameters');
      expect(errorArg.statusCode).toBe(400);
      expect(errorArg.code).toEqual(['"page" must be greater than or equal to 1']);
    });

    it('should pass multiple validation error messages', () => {
      const mockError = {
        details: [
          { message: 'Error 1' },
          { message: 'Error 2' },
          { message: 'Error 3' }
        ]
      };
      
      queryValidationSchema.validate.mockReturnValue({ error: mockError });
      
      queryValidation(mockReq, mockRes, mockNext);
      
      const errorArg = mockNext.mock.calls[0][0];
      expect(errorArg.code).toEqual(['Error 1', 'Error 2', 'Error 3']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single validation error', () => {
      const mockError = {
        details: [
          { message: 'Single error message' }
        ]
      };
      
      queryValidationSchema.validate.mockReturnValue({ error: mockError });
      
      queryValidation(mockReq, mockRes, mockNext);
      
      const errorArg = mockNext.mock.calls[0][0];
      expect(errorArg.code).toEqual(['Single error message']);
    });

    it('should not call next without error when validation passes', () => {
      queryValidationSchema.validate.mockReturnValue({ error: null });
      
      queryValidation(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call validation with exact query object', () => {
      const testQuery = { custom: 'value', another: 'param' };
      mockReq.query = testQuery;
      
      queryValidationSchema.validate.mockReturnValue({ error: null });
      
      queryValidation(mockReq, mockRes, mockNext);
      
      expect(queryValidationSchema.validate).toHaveBeenCalledWith(testQuery);
    });
  });

  describe('Error Status Code', () => {
    it('should always use 400 status code for validation errors', () => {
      const mockError = {
        details: [{ message: 'Any validation error' }]
      };
      
      queryValidationSchema.validate.mockReturnValue({ error: mockError });
      
      queryValidation(mockReq, mockRes, mockNext);
      
      const errorArg = mockNext.mock.calls[0][0];
      expect(errorArg.statusCode).toBe(400);
    });
  });
});
