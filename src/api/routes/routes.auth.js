import { Router } from 'express';
import * as authController from '../controllers/controllers.auth.js';
import { verifyToken } from '../middlewares/middlewares.auth.js'; 

const router = Router();

router.post('/register', authController.register);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-otp', authController.resendOtp);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/login', authController.login);
// router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.getMe);

// PROVIDER 
router.post('/provider/register', authController.registerProvider);
router.post('/provider/setup', verifyToken, authController.setupProviderProfile);







export default router;