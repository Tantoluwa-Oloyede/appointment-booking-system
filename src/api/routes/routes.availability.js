import { Router } from 'express';
import * as availabilityController from '../controllers/controllers.availability.js';
import { verifyToken } from '../middlewares/middlewares.auth.js';

const router = Router();

router.post('/setAvailability', verifyToken, availabilityController.setAvailability);
router.get('/getAvailability', verifyToken, availabilityController.getAvailability);
router.put('/updateAvailability/:id', verifyToken, availabilityController.updateAvailabilityRule);
router.get('/getSlots', verifyToken, availabilityController.getAvailableSlots);

export default router;