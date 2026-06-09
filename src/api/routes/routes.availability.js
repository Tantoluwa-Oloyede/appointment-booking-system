import { Router } from 'express';
import * as availabilityController from '../controllers/controllers.availability.js';
import { verifyToken } from '../middlewares/middlewares.auth.js';
import { validateBody, validateQuery } from '../middlewares/middlewares.validation.js';
import {
    setAvailabilitySchema,
    updateAvailabilityRuleSchema,
    getAvailableSlotsSchema
} from '../../lib/schemas/schema.availability.js';

const router = Router();

router.post('/setAvailability', verifyToken, validateBody(setAvailabilitySchema), availabilityController.setAvailability);
router.get('/getAvailability', verifyToken, availabilityController.getAvailability);
router.put('/updateAvailability/:id', verifyToken, validateBody(updateAvailabilityRuleSchema), availabilityController.updateAvailabilityRule);
router.get('/getSlots', verifyToken, validateQuery(getAvailableSlotsSchema), availabilityController.getAvailableSlots);

export default router;