import * as availabilityController from '../../src/api/controllers/controllers.availability.js';
import * as availabilityModel from '../../src/api/models/models.availability.js';
import * as serviceModel from '../../src/api/models/models.services.js';

// Mock dependencies
jest.mock('../../src/api/models/models.availability.js');
jest.mock('../../src/api/models/models.services.js');

describe('Availability Controller Unit Tests', () => {
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

  describe('setAvailability', () => {
    it('should fail if user is not provider', async () => {
      req.user.role = 'customer';
      await availabilityController.setAvailability(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          message: 'Only providers can set availability' 
        })
      );
    });

    it('should fail if business profile does not exist', async () => {
      serviceModel.getProviderProfileByUserId.mockResolvedValue(null);

      await availabilityController.setAvailability(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          message: 'You must complete your business profile before setting availability' 
        })
      );
    });

    it('should fail if availability has already been set previously', async () => {
      serviceModel.getProviderProfileByUserId.mockResolvedValue({ 
        id: '31e1e0b8-632a-11f1-ad6b-325096b39f47' 
      });
      availabilityModel.checkProviderHasAvailability.mockResolvedValue({ count: '7' });

      await availabilityController.setAvailability(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Availability already set.' })
      );
    });

    it('should validate rules and set availability successfully', async () => {
      serviceModel.getProviderProfileByUserId.mockResolvedValue({ id: 'prov-123' });
      availabilityModel.checkProviderHasAvailability.mockResolvedValue({ count: '0' });

      req.body = {
        rules: [
          {
            day_of_week: 1, // Monday
            status: 'open',
            start_time: '09:00',
            end_time: '17:00',
            break_start: '12:00',
            break_end: '13:00'
          }
        ]
      };

      availabilityModel.upsertAvailabilityRule.mockResolvedValue({
        id: '2ccf594a-6332-11f1-a2ac-325096b39f47',
        provider_id: '31788606-6332-11f1-a671-325096b39f47',
        day_of_week: 1,
        start_time: '09:00:00',
        end_time: '17:00:00',
        status: 'open'
      });

      await availabilityController.setAvailability(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          message: 'Availability set successfully'
        })
      );
    });
  });

  describe('updateAvailabilityRule', () => {
    it('should fail if break times are invalid (break_start after break_end)', async () => {
      req.params.id = '2ccf594a-6332-11f1-a2ac-325096b39f47';
      req.body = {
        status: 'open',
        start_time: '09:00',
        end_time: '17:00',
        break_start: '14:00',
        break_end: '13:00'
      };

      await availabilityController.updateAvailabilityRule(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'break_start must be before break_end' })
      );
    });
  });

  describe('getAvailableSlots', () => {
    it('should compute slots correctly', async () => {
      const tomorrow = new Date(); // Grabs exact time or right now 
      tomorrow.setDate(tomorrow.getDate() + 1); // MOodifies by rolling calendar forward by exactly 1 day 
      const dateStr = tomorrow.toISOString().split('T')[0]; // Converts date to standard format

      req.query = {
        provider_id: '31788606-6332-11f1-a671-325096b39f47',
        service_id: '98e55350-6332-11f1-bdd1-325096b39f47',
        date: dateStr
      };

      availabilityModel.getAvailabilityRuleByDay.mockResolvedValue({
        start_time: '09:00:00',
        end_time: '11:00:00',
        break_start: null,
        break_end: null,
        status: 'open'
      });

      availabilityModel.getServiceDuration.mockResolvedValue({
        duration_minutes: 60
      });

      availabilityModel.getBookedPeriodsForDate.mockResolvedValue([]);
      availabilityModel.getProviderBlocksForDate.mockResolvedValue([]);

      await availabilityController.getAvailableSlots(req, res, next);



      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.any(Array)
        })
      );
      // Under these parameters (9 to 11, duration 60 mins), should have 2 slots: 09:00-10:00 and 10:00-11:00
      expect(res.json.mock.calls[0][0].data.length).toBe(2);
    });
  });
});
