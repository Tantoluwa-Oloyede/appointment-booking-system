import { Router } from 'express';
import * as serviceController from '../controllers/controllers.services.js';
import { verifyToken } from '../middlewares/middlewares.auth.js';

const router = Router();

router.post('/createService', verifyToken, serviceController.createService);
router.get('/', verifyToken, serviceController.getServices);
router.get('/:id', verifyToken, serviceController.getServiceById);
router.patch('/:id', verifyToken, serviceController.updateService);
router.patch('/:id/deactivate', verifyToken, serviceController.deactivateService);

export default router;