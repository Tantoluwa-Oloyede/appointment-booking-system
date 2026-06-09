import * as bookingController from '../../src/api/controllers/controllers.booking.js';
import * as bookingModel from '../../src/api/models/models.booking.js';
import * as serviceModel from '../../src/api/models/models.services.js';
import sendMail from '../../src/api/services/email.js';

// Mock dependencies
jest.mock('../../src/api/models/models.booking.js');
jest.mock('../../src/api/models/models.services.js');
jest.mock('../../src/api/services/email.js');

describe('Booking Controller Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      user: { id: '43b60be4-63ba-11f1-b97b-325096b39f47', role: 'customer' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('should fail if user role is not customer', async () => {
      req.user.role = 'provider';
      await bookingController.createBooking(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          message: 'Only customers can create bookings' 
        })
      );
    });

    it('should fail if slot is in the past', async () => {
      req.body = {
        provider_id: '695ed600-63ba-11f1-9643-325096b39f47',
        service_id: 'b06aaa92-63ba-11f1-9762-325096b39f47',
        start_at: new Date(Date.now() - 3600000).toISOString() // Eaxctly 1 hour ago
      };
      await bookingController.createBooking(req, res, next);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Cannot book a slot in the past' })
      );
    });

    it('should fail if service does not exist or is inactive', async () => {
      req.body = {
        provider_id: '695ed600-63ba-11f1-9643-325096b39f47',
        service_id: 'b06aaa92-63ba-11f1-9762-325096b39f47',
        start_at: new Date(Date.now() + 3600000 * 24).toISOString() // tomorrow
      };
      bookingModel.getServiceWithProvider.mockResolvedValue(null);

      await bookingController.createBooking(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Service not found or is no longer active' 
        })
      );
    });

    it('should fail if slot is outside working hours', async () => {
      // Setup start time to be outside working hours 
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setUTCHours(2, 0, 0, 0); // 2 AM UTC

      req.body = {
        provider_id: '695ed600-63ba-11f1-9643-325096b39f47',
        service_id: 'b06aaa92-63ba-11f1-9762-325096b39f47',
        start_at: date.toISOString()
      };

      bookingModel.getServiceWithProvider.mockResolvedValue({
        id: 'b06aaa92-63ba-11f1-9762-325096b39f47',
        is_active: true,
        provider_id: '695ed600-63ba-11f1-9643-325096b39f47',
        duration_minutes: 60
      });

      // working hours: 09:00 to 17:00
      bookingModel.getProviderAvailabilityForDay.mockResolvedValue({
        start_time: '09:00:00',
        end_time: '17:00:00'
      });

      await bookingController.createBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('working hours') })
      );
    });

    it('should fail if slot falls in provider break time', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setUTCHours(12, 30, 0, 0); // 12:30 PM UTC

      req.body = {
        provider_id: '695ed600-63ba-11f1-9643-325096b39f47',
        service_id: 'b06aaa92-63ba-11f1-9762-325096b39f47',
        start_at: date.toISOString()
      };

      bookingModel.getServiceWithProvider.mockResolvedValue({
        id: 'b06aaa92-63ba-11f1-9762-325096b39f47',
        is_active: true,
        provider_id: '695ed600-63ba-11f1-9643-325096b39f47',
        duration_minutes: 60
      });

      bookingModel.getProviderAvailabilityForDay.mockResolvedValue({
        start_time: '09:00:00',
        end_time: '17:00:00',
        break_start: '12:00:00',
        break_end: '13:00:00'
      });

      await bookingController.createBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('break time') })
      );
    });

    it('should handle GIST exclusion constraint violation (double booking) with 409 Conflict', async () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setUTCHours(10, 0, 0, 0); // 10 AM UTC

      req.body = {
        provider_id: '695ed600-63ba-11f1-9643-325096b39f47',
        service_id: 'b06aaa92-63ba-11f1-9762-325096b39f47',
        start_at: date.toISOString()
      };

      bookingModel.getServiceWithProvider.mockResolvedValue({
        id: 'b06aaa92-63ba-11f1-9762-325096b39f47',
        is_active: true,
        provider_id: '695ed600-63ba-11f1-9643-325096b39f47',
        duration_minutes: 30
      });

      bookingModel.getProviderAvailabilityForDay.mockResolvedValue({
        start_time: '09:00:00',
        end_time: '17:00:00'
      });

      bookingModel.checkProviderBlockedForSlot.mockResolvedValue(false);

      const dbError = new Error('Exclusion violation');
      dbError.code = '23P01'; // Postgres exclusion constraint code
      bookingModel.createBooking.mockRejectedValue(dbError);

      await bookingController.createBooking(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'This slot has just been taken. Please choose another time.' })
      );
    });
  });

  describe('confirmBooking', () => {
    it('should confirm booking if provider profile exists and owns it', async () => {
      req.user = { id: '695ed600-63ba-11f1-9643-325096b39f47', role: 'provider' };
      req.params.id = 'aa670136-63ba-11f1-93b0-325096b39f47';

      serviceModel.getProviderProfileByUserId.mockResolvedValue({ id: '695ed600-63ba-11f1-9643-325096b39f47' });
      bookingModel.confirmBooking.mockResolvedValue({ id: 'aa670136-63ba-11f1-93b0-325096b39f47', status: 'confirmed' });
      bookingModel.getBookingById.mockResolvedValue({
        customer_name: 'John',
        customer_email: 'john@example.com',
        service_name: 'Haircut',
        business_name: 'Joe Salon'
      });
      sendMail.mockResolvedValue(true);

      await bookingController.confirmBooking(req, res, next);

      expect(bookingModel.confirmBooking).toHaveBeenCalledWith('aa670136-63ba-11f1-93b0-325096b39f47', '695ed600-63ba-11f1-9643-325096b39f47');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
