import { Router } from 'express';
import * as authController from '../controllers/controllers.auth.js';
import { verifyToken } from '../middlewares/middlewares.auth.js'; 
import { validateBody } from '../middlewares/middlewares.validation.js';
import {
    registerSchema,
    loginSchema,
    verifyEmailSchema,
    resendOtpSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    setupProviderProfileSchema
} from '../../lib/schemas/schema.auth.js';

const router = Router();

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/verify-email', validateBody(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-otp', validateBody(resendOtpSchema), authController.resendOtp);
router.post('/forgot-password', validateBody(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateBody(resetPasswordSchema), authController.resetPassword);
router.post('/login', validateBody(loginSchema), authController.login);
// router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.getMe);

// PROVIDER 
router.post('/provider/register', validateBody(registerSchema), authController.registerProvider);
router.post('/provider/setup', verifyToken, validateBody(setupProviderProfileSchema), authController.setupProviderProfile);

export default router;