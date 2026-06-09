import { Router } from 'express';
import * as bookingController from '../controllers/controllers.booking.js';
import { verifyToken } from '../middlewares/middlewares.auth.js';
import { validateBody } from '../middlewares/middlewares.validation.js';
import { createBookingSchema, cancelBookingSchema } from '../../lib/schemas/schema.booking.js';

const router = Router();

router.post('/createBooking', verifyToken, validateBody(createBookingSchema), bookingController.createBooking);
router.get('/getBookings', verifyToken, bookingController.getBookings);
router.get('/getBooking/:id', verifyToken, bookingController.getBookingById);
router.patch('/cancelBooking/:id', verifyToken, validateBody(cancelBookingSchema), bookingController.cancelBooking);
router.patch('/confirmBooking/:id', verifyToken, bookingController.confirmBooking);
router.patch('/completeBooking/:id', verifyToken, bookingController.completeBooking);

export default router;