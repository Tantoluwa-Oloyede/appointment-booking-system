import * as servicesController from '../../src/api/controllers/controllers.services.js';
import * as serviceModel from '../../src/api/models/models.services.js';

// Mock dependencies
jest.mock('../../src/api/models/models.services.js');

describe('Services Controller Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      user: { id: 'prov-user-123', role: 'provider' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createService', () => {
    it('should fail if user role is not provider', async () => {
      req.user.role = 'customer';
      await servicesController.createService(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Only providers can create services' })
      );
    });

    it('should fail if provider profile is not complete', async () => {
      serviceModel.getProviderProfileByUserId.mockResolvedValue(null);

      await servicesController.createService(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'You must complete your business profile before creating services' })
      );
    });

    it('should create service successfully', async () => {
      req.body = {
        name: 'Haircut',
        description: 'Standard trim',
        category: 'Hair',
        duration_minutes: 30,
        price: 50.00
      };

      serviceModel.getProviderProfileByUserId.mockResolvedValue({ id: 'prov-123' });
      serviceModel.createService.mockResolvedValue({
        id: 'srv-123',
        provider_id: 'prov-123',
        name: 'Haircut',
        price: 50.00
      });

      await servicesController.createService(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: 'Service created successfully'
        })
      );
    });
  });

  describe('getServices', () => {
    it('should fail if provider_id query parameter is missing', async () => {
      await servicesController.getServices(req, res, next);
      expect(res.status).toHaveBeenCalledWith(422);
    });

    it('should list services', async () => {
      req.query.provider_id = 'prov-123';
      serviceModel.getActiveServicesByProviderId.mockResolvedValue([
        { id: 'srv-1', name: 'Haircut', is_active: true }
      ]);

      await servicesController.getServices(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      );
    });
  });

  describe('deactivateService', () => {
    it('should deactivate service successfully', async () => {
      req.params.id = 'srv-123';
      serviceModel.getProviderProfileByUserId.mockResolvedValue({ id: 'prov-123' });
      serviceModel.deactivateService.mockResolvedValue({ id: 'srv-123', name: 'Haircut', is_active: false });

      await servicesController.deactivateService(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Service deactivated successfully' })
      );
    });
  });
});
