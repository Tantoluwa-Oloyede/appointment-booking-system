import Joi from 'joi';

export const createServiceSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(3)
        .max(150)
        .required()
        .messages({
            'string.empty': 'name is required',
            'string.min': 'name must be at least 3 characters',
            'string.max': 'name must not exceed 150 characters'
        }),

    duration_minutes: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'duration_minutes must be a number',
            'number.integer': 'duration_minutes must be an integer',
            'number.positive': 'duration_minutes must be a positive integer'
        }),

    price: Joi.number()
        .min(0)
        .precision(2)
        .required()
        .messages({
            'number.base': 'price must be a number',
            'number.min': 'price must be a non-negative number',
            'number.precision': 'price cannot have more than 2 decimal places'
        }),

    description: Joi.string()
        .trim()
        .max(1000)
        .allow(null, '')
        .optional(),

    category: Joi.string()
        .trim()
        .max(100)
        .allow(null, '')
        .optional()
});

export const updateServiceSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(3)
        .max(150)
        .optional()
        .messages({
            'string.min': 'name must be at least 3 characters',
            'string.max': 'name must not exceed 150 characters'
        }),

    duration_minutes: Joi.number()
        .integer()
        .positive()
        .optional()
        .messages({
            'number.base': 'duration_minutes must be a number',
            'number.integer': 'duration_minutes must be an integer',
            'number.positive': 'duration_minutes must be a positive integer'
        }),

    price: Joi.number()
        .min(0)
        .precision(2)
        .optional()
        .messages({
            'number.base': 'price must be a number',
            'number.min': 'price must be a non-negative number',
            'number.precision': 'price cannot have more than 2 decimal places'
        }),

    description: Joi.string()
        .trim()
        .max(1000)
        .allow(null, '')
        .optional(),

    category: Joi.string()
        .trim()
        .max(100)
        .allow(null, '')
        .optional()
}).min(1).messages({
    'object.min': 'At least one field is required to update'
});
