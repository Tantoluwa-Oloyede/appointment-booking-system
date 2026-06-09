import { verifyToken } from '../../src/api/middlewares/middlewares.auth.js';
import * as authModel from '../../src/api/models/models.auth.js';
import * as Helpers from '../../src/lib/utils/utils.helpers.js';

// Mock dependencies
jest.mock('../../src/api/models/models.auth.js');
jest.mock('../../src/lib/utils/utils.helpers.js');

describe('Auth Middleware Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if authorization header is missing', async () => {
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Please provide a token' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is not Bearer type', async () => {
    req.headers.authorization = 'Basic token123';
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid token sent' })
    );
  });

  it('should return 401 if JWT expires', async () => {
    req.headers.authorization = 'Bearer expired-jwt';
    Helpers.decodeJWTToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Session timeout' })
    );
  });

  it('should set req.user and call next() if token is valid', async () => {
    req.headers.authorization = 'Bearer valid-jwt';
    Helpers.decodeJWTToken.mockReturnValue({ user_id: 'user-123' });
    
    const mockUser = { id: 'user-123', is_active: true, is_verified: true };
    authModel.checkIfUserActivelyExistsByUserId.mockResolvedValue(mockUser);

    await verifyToken(req, res, next);

    expect(authModel.checkIfUserActivelyExistsByUserId).toHaveBeenCalledWith('user-123');
    expect(req.user).toBe(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('should fail if user is suspended', async () => {
    req.headers.authorization = 'Bearer valid-jwt';
    Helpers.decodeJWTToken.mockReturnValue({ user_id: 'user-123' });
    
    const mockUser = { id: 'user-123', is_active: false, is_verified: true };
    authModel.checkIfUserActivelyExistsByUserId.mockResolvedValue(mockUser);

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Your account has been suspended. Please contact support.' })
    );
  });
});
