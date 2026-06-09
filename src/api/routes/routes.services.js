import { Router } from 'express';
import * as serviceController from '../controllers/controllers.services.js';
import { verifyToken } from '../middlewares/middlewares.auth.js';
import { validateBody } from '../middlewares/middlewares.validation.js';
import { createServiceSchema, updateServiceSchema } from '../../lib/schemas/schema.services.js';

const router = Router();

router.post('/createService', verifyToken, validateBody(createServiceSchema), serviceController.createService);
router.get('/', verifyToken, serviceController.getServices);
router.get('/:id', verifyToken, serviceController.getServiceById);
router.patch('/:id', verifyToken, validateBody(updateServiceSchema), serviceController.updateService);
router.patch('/:id/deactivate', verifyToken, serviceController.deactivateService);

export default router;