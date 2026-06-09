import * as adminController from '../../src/api/controllers/controllers.admin.js';
import * as adminModel from '../../src/api/models/models.admin.js';

// Mock dependencies
jest.mock('../../src/api/models/models.admin.js');


describe('Admin Controller Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      user: { id: '12345ddc-7ebc-67a5-a7ac-622cf22f1111', role: 'admin' }
    };
    res = {
      status: jest.fn().mockReturnThis(), // fake express response 
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return system stats', async () => {
      adminModel.getStats.mockResolvedValue({ users: 10, bookings: 5 });

      await adminController.getStats(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: { users: 10, bookings: 5 }
        })
      );
    });
  });

  describe('suspendUser', () => {
    it('should fail if admin tries to suspend themselves', async () => {
      req.params.id = '12345ddc-7ebc-67a5-a7ac-622cf22f1111';
      await adminController.suspendUser(req, res, next);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'You cannot suspend your own account' })
      );
    });

    it('should suspend a user successfully', async () => {
      req.params.id = 'user-to-suspend-456';
      adminModel.suspendUser.mockResolvedValue({ id: 'user-to-suspend-456', email: 'user@example.com' });
      adminModel.createAuditLog.mockResolvedValue(true);

      await adminController.suspendUser(req, res, next);

      expect(adminModel.suspendUser).toHaveBeenCalledWith('user-to-suspend-456');
      expect(adminModel.createAuditLog).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getAllUsers', () => {
    it('should validate role filter', async () => {
      req.query.role = 'invalid-role';
      await adminController.getAllUsers(req, res, next);
      expect(res.status).toHaveBeenCalledWith(422);
    });

    it('should retrieve all users successfully', async () => {
      req.query = { role: 'customer', page: '1', limit: '10' };
      adminModel.getAllUsers.mockResolvedValue([{ id: '124d5ea0-09aa-743f-66e6-1234e7dc4d23', email: 'customer1@example.com' }]);
      adminModel.countAllUsers.mockResolvedValue({ total: '1' });

      await adminController.getAllUsers(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: [{ id: '124d5ea0-09aa-743f-66e6-1234e7dc4d23', email: 'customer1@example.com' }]
        })
      );
    });
  });
});