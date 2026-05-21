import { Router } from 'express';
import * as adminController from '../controllers/controllers.admin.js';
import { verifyToken } from '../middlewares/middlewares.auth.js';
import { requireAdmin } from '../middlewares/middlewares.admin.js';

const router = Router();

// verifyToken first then requireAdmin checks the role
router.use(verifyToken, requireAdmin);

// stats
router.get('/getStats', adminController.getStats);

// users
router.get('/allUsers', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/suspend', adminController.suspendUser);
router.patch('/users/:id/activate', adminController.activateUser);
router.patch('/users/:id/make-admin', adminController.makeAdmin);
router.patch('/users/:id/remove-admin', adminController.removeAdmin);

// providers
router.get('/allProviders', adminController.getAllProviders);
router.get('/providers/:id', adminController.getProviderById);

// bookings
router.get('/allBookings', adminController.getAllBookings);
router.get('/bookings/:id', adminController.getBookingById);

export default router;