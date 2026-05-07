import * as authModel from '../models/models.auth.js';
import * as Hash from '../../lib/utils/utils.hash.js';
import * as Helpers from '../../lib/utils/utils.helpers.js';
import sendMail from '../services/email.js';


// SHARED VALIDATION  
const validateBaseRegistrationFields = ({ full_name, email, phone, password }) => {
    if (!full_name || !email || !phone || !password) {
        return 'full_name, email, phone, and password are required';
    }
    if (full_name.trim().length < 3) {
        return 'full_name must be at least 3 characters';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Invalid email format';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    return null;
};

// SHARED REGISTRATION LOGIC 
// Handles: email check, hashing, OTP, email send, DB insert
// role is passed in so both customer and provider use this

const handleBaseRegistration = async ({ full_name, email, phone, password, role }) => {
    const existingUser = await authModel.checkUserExistsByEmail(email);
    if (existingUser) {
        return { status: 409, message: 'An account with this email already exists' };
    }

    const existingPhone = await authModel.checkUserExistsByPhone(phone);
    if (existingPhone) {
        return { status: 409, message: 'An account with this phone number already exists' };
    }

    const password_hash = await Hash.hashData(password);

    const verificationCode = Helpers.generateVerificationCode(6);
    const verificationCodeDuration = 3; // minutes
    const verificationCodeExpireAt = new Date(Date.now() + verificationCodeDuration * 60 * 1000);

    const emailContent = `Hello ${full_name}, kindly verify your account using this OTP: ${verificationCode}. This OTP will expire in ${verificationCodeDuration} minutes.`;
    await sendMail(email, 'Verify Your Account', emailContent);

    const newUser = await authModel.createUser({
        full_name,
        email,
        phone,
        password_hash,
        role,
        verification_token: verificationCode,
        verification_token_expires_at: verificationCodeExpireAt
    });

    return { status: 201, data: newUser };
};


//  CUSTOMER REGISTER  
export const register = async (req, res, next) => {
    try {
        const { full_name, email, phone, password, role } = req.body;

        // block anyone trying to sneak in a different role
        if (role && role !== 'customer') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'This endpoint is for customer registration only'
            });
        }

        const validationError = validateBaseRegistrationFields({ full_name, email, phone, password });
        if (validationError) {
            return res.status(422).json({ status: 'error', code: 422, message: validationError });
        }

        const result = await handleBaseRegistration({ full_name, email, phone, password, role: 'customer' });

        if (result.status !== 201) {
            return res.status(result.status).json({ status: 'error', code: result.status, message: result.message });
        }

        return res.status(201).json({
            status: 'success',
            code: 201,
            message: 'Account created successfully. Please check your email for your OTP.',
            data: result.data
        });

    } catch (error) {
        return next(error);
    }
};

//  PROVIDER REGISTER
export const registerProvider = async (req, res, next) => {
    try {
        const { full_name, email, phone, password } = req.body;

        const validationError = validateBaseRegistrationFields({ full_name, email, phone, password });
        if (validationError) {
            return res.status(422).json({ status: 'error', code: 422, message: validationError });
        }

        const result = await handleBaseRegistration({ full_name, email, phone, password, role: 'provider' });

        if (result.status !== 201) {
            return res.status(result.status).json({ status: 'error', code: result.status, message: result.message });
        }

        return res.status(201).json({
            status: 'success',
            code: 201,
            message: 'Provider account created. Verify your email to complete your business profile setup.',
            data: result.data
        });

    } catch (error) {
        return next(error);
    }
};

//  PROVIDER SETUP 
export const setupProviderProfile = async (req, res, next) => {
    try {
        const { business_name, bio, address } = req.body;
        const { id: user_id, role, is_verified } = req.user;

        if (role !== 'provider') {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Only provider accounts can set up a business profile'
            });
        }

        if (!is_verified) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Please verify your email before setting up your business profile'
            });
        }

        if (!business_name) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'business_name is required'
            });
        }

        if (business_name.trim().length < 3) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'business_name must be at least 3 characters'
            });
        }

        const existingBusinessName = await authModel.checkBusinessNameExists(business_name);
        if (existingBusinessName) {
            return res.status(409).json({
                status: 'error',
                code: 409,
                message: 'A business with this name already exists'
            });
        }

        const existingProfile = await authModel.getProviderProfileByUserId(user_id);
        if (existingProfile) {
            return res.status(409).json({
                status: 'error',
                code: 409,
                message: 'Business profile already exists for this account'
            });
        }

        const providerProfile = await authModel.createProviderProfile({
            user_id,
            business_name,
            bio,
            address
        });

        return res.status(201).json({
            status: 'success',
            code: 201,
            message: 'Business profile set up successfully.',
            data: providerProfile
        });

    } catch (error) {
        return next(error);
    }
};

//  VERIFY EMAIL
export const verifyEmail = async (req, res, next) => {
    try {
        const { verification_code, email } = req.body;

        // required fields
        if (!email || !verification_code) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'email and verification_code are required'
            });
        }

        // must be exactly 6 digits
        if (verification_code.length !== 6) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'verification_code must be 6 digits'
            });
        }

        // find user by email
        const user = await authModel.findUserByEmailForVerification(email);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'No account found with this email'
            });
        }

        // already verified
        if (user.is_verified) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'This account is already verified'
            });
        }

        // OTP expired
        if (new Date() > new Date(user.verification_token_expires_at)) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // OTP does not match
        if (verification_code !== user.verification_token) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Invalid verification code'
            });
        }

        // mark as verified and clear token from DB
        const verifiedUser = await authModel.markUserAsVerified(user.id);

        // send welcome email
        const emailContent = `Hello ${user.full_name}, welcome! Your account has been successfully verified. You can now log in.`;
        await sendMail(user.email, 'Account Verified', emailContent);

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Account verified successfully. You can now log in.',
            data: verifiedUser
        });

    } catch (error) {
        return next(error);
    }
};

//  LOGIN 
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'email and password are required'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'Invalid email format'
            });
        }

        const user = await authModel.findUserForLogin(email);

        // SECURITY: same message for both user not found and wrong password
        // never reveal which one failed — prevents email enumeration
        if (!user) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Invalid email or password'
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Your account has been suspended. Please contact support.'
            });
        }

        if (!user.is_verified) {
            return res.status(403).json({
                status: 'error',
                code: 403,
                message: 'Please verify your email before logging in'
            });
        }

        const validPassword = await Hash.compareData(password, user.password_hash);

        // SECURITY: same message as user not found
        if (!validPassword) {
            return res.status(401).json({
                status: 'error',
                code: 401,
                message: 'Invalid email or password'
            });
        }

        const token = Helpers.generateJWTToken(user);

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        return next(error);
    }
};

// RESEND OTP 
export const resendOtp = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'email is required'
            });
        }

        const user = await authModel.findUserByEmailForVerification(email);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'No account found with this email'
            });
        }

        if (user.is_verified) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'This account is already verified'
            });
        }

        const verificationCode = Helpers.generateVerificationCode(6);
        const verificationCodeDuration = 10; // minutes
        const verificationCodeExpireAt = new Date(Date.now() + verificationCodeDuration * 60 * 1000);

        await authModel.updateVerificationToken({
            email,
            verification_token: verificationCode,
            verification_token_expires_at: verificationCodeExpireAt
        });

        const emailContent = `Hello ${user.full_name}, your new OTP is: ${verificationCode}. This OTP will expire in ${verificationCodeDuration} minutes.`;
        await sendMail(email, 'Resend OTP - Verify Your Account', emailContent);

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'A new OTP has been sent to your email'
        });

    } catch (error) {
        return next(error);
    }
};

//  FORGOT PASSWORD 
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'email is required'
            });
        }

        const user = await authModel.findUserByEmailForVerification(email);

        // SECURITY: always return success even if email doesn't exist
        // prevents email enumeration attacks
        if (!user) {
            return res.status(200).json({
                status: 'success',
                code: 200,
                message: 'If an account with this email exists, a reset OTP has been sent'
            });
        }

        const resetCode = Helpers.generateVerificationCode(6);
        const resetCodeDuration = 15; // minutes
        const resetCodeExpireAt = new Date(Date.now() + resetCodeDuration * 60 * 1000);

        await authModel.updatePasswordResetToken({
            email,
            verification_token: resetCode,
            verification_token_expires_at: resetCodeExpireAt
        });

        const emailContent = `Hello ${user.full_name}, your password reset OTP is: ${resetCode}. This OTP will expire in ${resetCodeDuration} minutes. If you did not request this, ignore this email.`;
        await sendMail(email, 'Reset Your Password', emailContent);

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'If an account with this email exists, a reset OTP has been sent'
        });

    } catch (error) {
        return next(error);
    }
};

//  RESET PASSWORD 
export const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, new_password } = req.body;

        if (!email || !otp || !new_password) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'email, otp, and new_password are required'
            });
        }

        if (new_password.length < 8) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'new_password must be at least 8 characters'
            });
        }

        if (otp.length !== 6) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'otp must be 6 digits'
            });
        }

        const user = await authModel.findUserByEmailForVerification(email);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'No account found with this email'
            });
        }

        if (!user.verification_token) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'No password reset was requested for this account'
            });
        }

        if (new Date() > new Date(user.verification_token_expires_at)) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        if (otp !== user.verification_token) {
            return res.status(400).json({
                status: 'error',
                code: 400,
                message: 'Invalid OTP'
            });
        }

        const password_hash = await Hash.hashData(new_password);
        await authModel.resetPassword({ id: user.id, password_hash });

        const emailContent = `Hello ${user.full_name}, your password has been successfully reset. If you did not do this, contact support immediately.`;
        await sendMail(user.email, 'Password Reset Successful', emailContent);

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'Password reset successfully. You can now log in with your new password.'
        });

    } catch (error) {
        return next(error);
    }
};

//  GET CURRENT USER PROFILE 
export const getMe = async (req, res, next) => {
    try {
        const { id } = req.user;

        const user = await authModel.getUserById(id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                code: 404,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            code: 200,
            message: 'User profile fetched successfully',
            data: user
        });

    } catch (error) {
        return next(error);
    }
};




// export const forgotPassword = async (req, res, next) => {
//     try {
//         const { email } = req.body;

//         if (!email) {
//             return res.status(422).json({
//                 status: 'error',
//                 code: 422,
//                 message: 'email is required'
//             });
//         }

//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(email)) {
//             return res.status(422).json({
//                 status: 'error',
//                 code: 422,
//                 message: 'Invalid email format'
//             });
//         }

//         const user = await authModel.findUserByEmailForVerification(email);

//         // SECURITY: if user doesn't exist, still return 200
//         // never confirm or deny whether an email is registered
//         if (!user) {
//             return res.status(200).json({
//                 status: 'success',
//                 code: 200,
//                 message: 'If an account with this email exists, a reset OTP has been sent. Please check your inbox and spam folder.'
//             });
//         }

//         // account exists but is suspended
//         if (!user.is_active) {
//             return res.status(200).json({
//                 status: 'success',
//                 code: 200,
//                 message: 'If an account with this email exists, a reset OTP has been sent. Please check your inbox and spam folder.'
//             });
//         }

//         const resetCode = Helpers.generateVerificationCode(6);
//         const resetCodeDuration = 15; // minutes
//         const resetCodeExpireAt = new Date(Date.now() + resetCodeDuration * 60 * 1000);

//         await authModel.updatePasswordResetToken({
//             email,
//             verification_token: resetCode,
//             verification_token_expires_at: resetCodeExpireAt
//         });

//         const emailContent = `Hello ${user.full_name}, your password reset OTP is: ${resetCode}. This OTP will expire in ${resetCodeDuration} minutes. If you did not request this, ignore this email.`;
//         await sendMail(email, 'Reset Your Password', emailContent);

//         return res.status(200).json({
//             status: 'success',
//             code: 200,
//             message: 'If an account with this email exists, a reset OTP has been sent. Please check your inbox and spam folder.'
//         });

//     } catch (error) {
//         return next(error);
//     }
// };