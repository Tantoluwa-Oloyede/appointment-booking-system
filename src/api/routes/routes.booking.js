import { Router } from 'express';
import * as bookingController from '../controllers/controllers.booking.js';
import { verifyToken } from '../middlewares/middlewares.auth.js';

const router = Router();

router.post('/createBooking', verifyToken, bookingController.createBooking);
router.get('/getBookings', verifyToken, bookingController.getBookings);
router.get('/getBooking/:id', verifyToken, bookingController.getBookingById);
router.patch('/cancelBooking/:id', verifyToken, bookingController.cancelBooking);
router.patch('/confirmBooking/:id', verifyToken, bookingController.confirmBooking);
router.patch('/completeBooking/:id', verifyToken, bookingController.completeBooking);

export default router;