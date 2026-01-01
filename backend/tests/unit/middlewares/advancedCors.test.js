const advancedCors = require('../../../src/middlewares/advancedCors.middleware');

describe('Advanced CORS Middleware', () => {
  let mockReq, mockRes, mockNext;
  const originalEnv = process.env.FRONTEND_URL;

  beforeAll(() => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      headers: {}
    };
    
    mockRes = {
      header: jest.fn(),
      sendStatus: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockNext = jest.fn();
  });

  afterAll(() => {
    process.env.FRONTEND_URL = originalEnv;
  });

  describe('Allowed Origins', () => {
    it('should allow requests from configured origins', () => {
      mockReq.headers.origin = 'http://localhost:5173';
      
      advancedCors(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set CORS headers for allowed origins', () => {
      mockReq.headers.origin = 'http://localhost:5173';
      
      advancedCors(mockReq, mockRes, mockNext);
      
      expect(mockRes.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173');
      expect(mockRes.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });

    it('should set Vary header', () => {
      mockReq.headers.origin = 'http://localhost:5173';
      
      advancedCors(mockReq, mockRes, mockNext);
      
      expect(mockRes.header).toHaveBeenCalledWith('Vary', 'Origin');
    });
  });

  describe('Blocked Origins', () => {
    it('should block requests from disallowed origins', () => {
      mockReq.headers.origin = 'http://malicious-site.com';
      
      advancedCors(mockReq, mockRes, mockNext);
      
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not set CORS headers for blocked origins', () => {
      mockReq.headers.origin = 'http://malicious-site.com';
      
      advancedCors(mockReq, mockRes, mockNext);
      
      expect(mockRes.header).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', expect.anything());
    });
  });

  describe('No Origin Header', () => {
    it('should allow requests without origin header', () => {
      // No origin header
      
      advancedCors(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Preflight Requests (OPTIONS)', () => {
    it('should handle preflight for allowed origin', () => {
      mockReq.method = 'OPTIONS';
      mockReq.headers.origin = 'http://localhost:5173';
      
      advancedCors(mockReq, mockRes, mockNext);
      
      expect(mockRes.sendStatus).toHaveBeenCalledWith(204);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject preflight for disallowed origin', () => {
      mockReq.method = 'OPTIONS';
      mockReq.headers.origin = 'http://malicious-site.com';
      
      advancedCors(mockReq, mockRes, mockNext);
      
      expect(mockRes.sendStatus).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('HTTP Methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

    methods.forEach(method => {
      it(`should allow ${method} requests from allowed origins`, () => {
        mockReq.method = method;
        mockReq.headers.origin = 'http://localhost:5173';
        
        advancedCors(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });
});
