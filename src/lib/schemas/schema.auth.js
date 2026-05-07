import Joi from 'joi';

// import JoiDate from '@joi/date';
// const Joi = Joi.extend(JoiDate);

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
        minDomainSegments: 2, // Always ensures it is @gmail.com and not @@gmail or @@@gmail.com
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
    .optional()
    .messages({
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

 
});

// export const loginSchema = Joi.object({
//   email: Joi.string()
//     .email()
//     .required()
//     .messages({
//       'string.empty': 'Email is required',
//       'string.email': 'Please provide a valid email address'
//     }),

//   password: Joi.string()
//     .required()
//     .messages({
//       'string.empty': 'Password is required'
//     })
// });

// export const resendPasswordSchema = Joi.object({
//   email: Joi.string()
//     .email()
//     .required()
//     .messages({
//       'string.empty': 'Email is required',
//       'string.email': 'Please provide a valid email address'
//     })
// });

// export const verifyAccountSchema = Joi.object({
//   token: Joi.string()
//     .required()
//     .messages({
//       'string.empty': 'Verification token is required'
//     })
// });