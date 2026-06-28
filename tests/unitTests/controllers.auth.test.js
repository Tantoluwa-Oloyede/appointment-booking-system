import * as authController from '../../src/api/controllers/controllers.auth.js';
import * as authModel from '../../src/api/models/models.auth.js';
import * as Hash from '../../src/lib/utils/utils.hash.js';
import * as Helpers from '../../src/lib/utils/utils.helpers.js';
import sendMail from '../../src/api/services/email.js';

// Mock dependencies
jest.mock('../../src/api/models/models.auth.js');
jest.mock('../../src/lib/utils/utils.hash.js');
jest.mock('../../src/lib/utils/utils.helpers.js');
jest.mock('../../src/api/services/email.js');

describe('Auth Controller Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, user: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should fail if role is not customer', async () => {
      req.body = { role: 'admin' };
      await authController.register(req, res, next); // running actual controller code using fake environment
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          message: 'This endpoint is for customer registration only' 
        })
      );
    });

    it('should successfully register a customer', async () => {
      req.body = {
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+2349022436813',
        password: 'P@ssword123',
        role: 'customer'
      };

      authModel.checkUserExistsByEmail.mockResolvedValue(null);
      authModel.checkUserExistsByPhone.mockResolvedValue(null);
      Hash.hashData.mockResolvedValue('hashed_password');
      Helpers.generateVerificationCode.mockReturnValue('123456');
      sendMail.mockResolvedValue(true);
      
      const mockUser = { 
        id: '54e0a06e-6329-11f1-8fab-325096b39f47', 
        full_name: 'John Doe', 
        email: 'john@example.com' 
      };
      authModel.createUser.mockResolvedValue(mockUser);

      await authController.register(req, res, next);

      expect(authModel.checkUserExistsByEmail).toHaveBeenCalledWith('john@example.com');
      expect(authModel.createUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: mockUser
        })
      );
    });

    it('should fail if email already exists', async () => {
      req.body = { 
        full_name: 'John Doe', 
        email: 'john@example.com', 
        password: 'P@ssword123' 
      };
      authModel.checkUserExistsByEmail.mockResolvedValue({ id: 'existing' });

      await authController.register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          message: 'An account with this email already exists' 
        })
      );
    });
  });

  describe('registerProvider', () => {
    it('should register a provider successfully', async () => {
      req.body = { 
        full_name: 'Provider Joe', 
        email: 'joe@business.com', 
        password: 'pas$worD123' 
      };
      authModel.checkUserExistsByEmail.mockResolvedValue(null);
      authModel.checkUserExistsByPhone.mockResolvedValue(null);
      Hash.hashData.mockResolvedValue('hashed_password');
      Helpers.generateVerificationCode.mockReturnValue('654321');
      sendMail.mockResolvedValue(true);

      const mockProvider = { 
        id: '31e1e0b8-632a-11f1-ad6b-325096b39f47', 
        full_name: 'Provider Joe', 
        email: 'joe@business.com' 
      };
      authModel.createUser.mockResolvedValue(mockProvider);

      await authController.registerProvider(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: expect.stringContaining('Provider account created')
        })
      );
    });
  });

  describe('setupProviderProfile', () => {
    it('should fail if user is not a provider', async () => {
      req.user = { 
        id: '54e0a06e-6329-11f1-8fab-325096b39f47', 
        role: 'customer', 
        is_verified: true 
      };
      await authController.setupProviderProfile(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should fail if email is not verified', async () => {
      req.user = { 
        id: '54e0a06e-6329-11f1-8fab-325096b39f47', 
        role: 'provider', 
        is_verified: false 
      };
      await authController.setupProviderProfile(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should set up profile successfully', async () => {
      req.user = { 
        id: '31e1e0b8-632a-11f1-ad6b-325096b39f47', 
        role: 'provider', 
        is_verified: true 
      };
      req.body = { 
        business_name: 'Nail Salon', 
        bio: 'Nice salon', 
        address: '123 main st' };

      authModel.checkBusinessNameExists.mockResolvedValue(null);
      authModel.getProviderProfileByUserId.mockResolvedValue(null);
      authModel.createProviderProfile.mockResolvedValue({ 
        id: '31e1e0b8-632a-11f1-ad6b-325096b39f47', 
        business_name: 'Nail Salon' 
      });

      await authController.setupProviderProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          status: 'success', 
          message: 'Business profile set up successfully.' 
        })
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      req.body = { 
        email: 'john@example.com', 
        verification_code: '123456' 
      };
      const mockUser = {
        id: '54e0a06e-6329-11f1-8fab-325096b39f47',
        full_name: 'John',
        email: 'john@example.com',
        is_verified: false,
        verification_token: '123456',
        verification_token_expires_at: new Date(Date.now() + 100000)
      };

      authModel.findUserByEmailForVerification.mockResolvedValue(mockUser);
      authModel.markUserAsVerified.mockResolvedValue({ ...mockUser, is_verified: true });

      await authController.verifyEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Account verified successfully. You can now log in.' })
      );
    });

    it('should fail if code is invalid', async () => {
      req.body = { email: 'john@example.com', verification_code: 'wrong' };
      const mockUser = {
        id: '54e0a06e-6329-11f1-8fab-325096b39f47',
        email: 'john@example.com',
        is_verified: false,
        verification_token: '123456',
        verification_token_expires_at: new Date(Date.now() + 100000)
      };

      authModel.findUserByEmailForVerification.mockResolvedValue(mockUser);

      await authController.verifyEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid verification code' })
      );
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      req.body = { email: 'john@example.com', password: 'password123' };
      const mockUser = {
        id: '54e0a06e-6329-11f1-8fab-325096b39f47',
        full_name: 'John',
        email: 'john@example.com',
        role: 'customer',
        password_hash: 'hashed',
        is_active: true,
        is_verified: true
      };

      authModel.findUserForLogin.mockResolvedValue(mockUser);
      Hash.compareData.mockResolvedValue(true);
      Helpers.generateJWTToken.mockReturnValue('mock-jwt-token');

      await authController.login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          code: 200,
          message: 'Login successful',
          data: {
            user: { 
                    id: '54e0a06e-6329-11f1-8fab-325096b39f47', 
                    full_name: 'John', 
                    email: 'john@example.com', 
                    role: 'customer' 
                  },
            token: 'mock-jwt-token'
          }
        })
      );
    });
  });
});
