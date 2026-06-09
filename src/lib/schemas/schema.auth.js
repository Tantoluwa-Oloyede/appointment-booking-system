import Joi from 'joi';

export const registerSchema = Joi.object({
    full_name: Joi.string()
        .trim()
        .pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)
        .min(3)
        .max(150)
        .required()
        .messages({
            'string.empty': 'Full name is required',
            'string.min': 'Full name must be at least 3 characters',
            'string.max': 'Full name must not exceed 150 characters',
            'string.pattern.base': 'Full name can only contain letters, spaces, hyphens, and apostrophes'
        }),

    email: Joi.string()
        .trim()
        .lowercase()
        .email({ 
            minDomainSegments: 2,
            tlds: { allow: false } 
        })
        .max(254)
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address',
            'string.max': 'Email must not exceed 254 characters'
        }),

    phone: Joi.string()
        .trim()
        .pattern(/^\+?[1-9]\d{7,14}$/)
        .required()
        .messages({
            'string.empty': 'Phone number is required',
            'string.pattern.base': 'Please provide a valid phone number in international format'
        }),

    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}\-_=+]).+$/)
        .required()
        .messages({
            'string.empty': 'Password is required',
            'string.min': 'Password must be at least 8 characters long',
            'string.max': 'Password must not exceed 128 characters',
            'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character'
        }),

    role: Joi.string()
        .valid('customer', 'provider')
        .optional()
});

export const loginSchema = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address'
        }),

    password: Joi.string()
        .required()
        .messages({
            'string.empty': 'Password is required'
        })
});

export const verifyEmailSchema = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address'
        }),

    verification_code: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({
            'string.empty': 'Verification code is required',
            'string.length': 'Verification code must be exactly 6 digits',
            'string.pattern.base': 'Verification code must contain only numbers'
        })
});

export const resendOtpSchema = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address'
        })
});

export const forgotPasswordSchema = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address'
        })
});

export const resetPasswordSchema = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please provide a valid email address'
        }),

    otp: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({
            'string.empty': 'OTP is required',
            'string.length': 'OTP must be exactly 6 digits',
            'string.pattern.base': 'OTP must contain only numbers'
        }),

    new_password: Joi.string()
        .min(8)
        .max(128)
        .required()
        .messages({
            'string.empty': 'New password is required',
            'string.min': 'New password must be at least 8 characters long'
        })
});

export const setupProviderProfileSchema = Joi.object({
    business_name: Joi.string()
        .trim()
        .min(3)
        .max(180)
        .required()
        .messages({
            'string.empty': 'Business name is required',
            'string.min': 'Business name must be at least 3 characters',
            'string.max': 'Business name must not exceed 180 characters'
        }),

    bio: Joi.string()
        .trim()
        .max(1000)
        .allow(null, '')
        .optional(),

    address: Joi.string()
        .trim()
        .max(500)
        .allow(null, '')
        .optional()
});
