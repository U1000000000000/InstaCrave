/**
 * Unit Tests: Response Utility
 * Tests standardized API response formatting
 */

const responseUtil = require('../../../src/utils/response');

describe('Response Utility', () => {
  
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('sendListResponse', () => {
    
    it('should send list response with data and message', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const message = 'Items fetched successfully';

      responseUtil.sendListResponse(mockRes, { data, message });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data,
        pagination: {},
        filters: {},
        sort: {}
      });
    });

    it('should include pagination metadata', () => {
      const data = [{ id: 1 }];
      const pagination = { total: 100, limit: 10, skip: 0 };

      responseUtil.sendListResponse(mockRes, { data, pagination });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ pagination })
      );
    });

    it('should include filters', () => {
      const data = [];
      const filters = { category: 'pizza', price: { $gte: 10 } };

      responseUtil.sendListResponse(mockRes, { data, filters });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ filters })
      );
    });

    it('should include sort parameters', () => {
      const data = [];
      const sort = { createdAt: -1, name: 1 };

      responseUtil.sendListResponse(mockRes, { data, sort });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ sort })
      );
    });

    it('should handle empty data array', () => {
      responseUtil.sendListResponse(mockRes, { data: [] });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [] })
      );
    });

    it('should default message to empty string', () => {
      responseUtil.sendListResponse(mockRes, { data: [] });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '' })
      );
    });
  });

  describe('sendItemResponse', () => {
    
    it('should send item response with data and message', () => {
      const data = { id: 1, name: 'Test Item' };
      const message = 'Item created successfully';

      responseUtil.sendItemResponse(mockRes, { data, message });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data
      });
    });

    it('should handle null data', () => {
      const message = 'Item deleted successfully';

      responseUtil.sendItemResponse(mockRes, { data: null, message });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data: null
      });
    });

    it('should handle complex data objects', () => {
      const data = {
        user: { id: 1, name: 'John' },
        orders: [{ id: 1 }, { id: 2 }],
        metadata: { total: 2 }
      };

      responseUtil.sendItemResponse(mockRes, { data });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ data })
      );
    });

    it('should default message to empty string', () => {
      responseUtil.sendItemResponse(mockRes, { data: {} });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '' })
      );
    });
  });

  describe('sendErrorResponse', () => {
    
    it('should send error response with message and status', () => {
      const message = 'Resource not found';
      const status = 404;

      responseUtil.sendErrorResponse(mockRes, { message, status });

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message,
        details: []
      });
    });

    it('should default to status 500', () => {
      responseUtil.sendErrorResponse(mockRes, { message: 'Server error' });

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should default to generic error message', () => {
      responseUtil.sendErrorResponse(mockRes, { status: 500 });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'An error occurred',
        details: []
      });
    });

    it('should include error details', () => {
      const details = [
        { field: 'email', message: 'Invalid format' },
        { field: 'password', message: 'Too short' }
      ];

      responseUtil.sendErrorResponse(mockRes, {
        message: 'Validation failed',
        status: 400,
        details
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        details
      });
    });

    it('should handle empty details array', () => {
      responseUtil.sendErrorResponse(mockRes, {
        message: 'Error',
        status: 400,
        details: []
      });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ details: [] })
      );
    });
  });

  describe('Response Format Consistency', () => {
    
    it('should always include success field in list responses', () => {
      responseUtil.sendListResponse(mockRes, { data: [] });

      const call = mockRes.json.mock.calls[0][0];
      expect(call).toHaveProperty('success');
      expect(call.success).toBe(true);
    });

    it('should always include success field in item responses', () => {
      responseUtil.sendItemResponse(mockRes, { data: {} });

      const call = mockRes.json.mock.calls[0][0];
      expect(call).toHaveProperty('success');
      expect(call.success).toBe(true);
    });

    it('should always include success field in error responses', () => {
      responseUtil.sendErrorResponse(mockRes, { message: 'Error' });

      const call = mockRes.json.mock.calls[0][0];
      expect(call).toHaveProperty('success');
      expect(call.success).toBe(false);
    });
  });
});
