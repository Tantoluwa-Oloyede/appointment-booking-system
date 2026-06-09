import Joi from 'joi';

export const setAvailabilitySchema = Joi.object({
    rules: Joi.array()
        .items(
            Joi.object({
                day_of_week: Joi.number()
                    .integer()
                    .min(0)
                    .max(6)
                    .required()
                    .messages({
                        'number.base': 'day_of_week must be a number',
                        'number.min': 'day_of_week must be between 0 and 6',
                        'number.max': 'day_of_week must be between 0 and 6',
                        'any.required': 'day_of_week is required'
                    }),

                status: Joi.string()
                    .valid('open', 'closed')
                    .required()
                    .messages({
                        'any.only': 'status must be either "open" or "closed"',
                        'any.required': 'status is required'
                    }),

                start_time: Joi.string()
                    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
                    .when('status', { 
                        is: 'open', 
                        then: Joi.required(), 
                        otherwise: Joi.forbidden() 
                    })
                    .messages({
                        'string.pattern.base': 'start_time must be in HH:MM format (e.g. 08:00)',
                        'any.required': 'start_time is required for open days',
                        'any.unknown': 'start_time must not be provided for closed days'
                    }),

                end_time: Joi.string()
                    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
                    .when('status', { 
                        is: 'open', 
                        then: Joi.required(), 
                        otherwise: Joi.forbidden() 
                    })
                    .messages({
                        'string.pattern.base': 'end_time must be in HH:MM format (e.g. 17:00)',
                        'any.required': 'end_time is required for open days',
                        'any.unknown': 'end_time must not be provided for closed days'
                    }),

                break_start: Joi.string()
                    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
                    .allow(null, '')
                    .optional()
                    .when('status', { 
                        is: 'open', 
                        then: Joi.optional(), 
                        otherwise: Joi.forbidden() 
                    })
                    .messages({
                        'string.pattern.base': 'break_start must be in HH:MM format (e.g. 12:00)',
                        'any.unknown': 'break_start must not be provided for closed days'
                    }),

                break_end: Joi.string()
                    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
                    .allow(null, '')
                    .optional()
                    .when('status', { 
                        is: 'open', 
                        then: Joi.optional(), 
                        otherwise: Joi.forbidden() 
                    })
                    .messages({
                        'string.pattern.base': 'break_end must be in HH:MM format (e.g. 13:00)',
                        'any.unknown': 'break_end must not be provided for closed days'
                    })
            })
        )
        .min(1)
        .max(7)
        .unique('day_of_week')
        .required()
        .messages({
            'array.min': 'At least one availability rule must be provided',
            'array.max': 'You cannot provide more than 7 availability rules',
            'array.unique': 'Each Day of the week must appear only once in the rules array'
        })
});

export const updateAvailabilityRuleSchema = Joi.object({
    status: Joi.string()
        .valid('open', 'closed')
        .optional()
        .messages({
            'any.only': 'status must be either "open" or "closed"'
        }),

    start_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .optional()
        .when('status', { 
            is: 'closed', 
            then: Joi.forbidden() 
        })
        .messages({
            'string.pattern.base': 'start_time must be in HH:MM format (e.g. 08:00)',
            'any.unknown': 'start_time must not be provided when status is closed'
        }),

    end_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .optional()
        .when('status', { 
            is: 'closed', 
            then: Joi.forbidden() 
        })
        .messages({
            'string.pattern.base': 'end_time must be in HH:MM format (e.g. 17:00)',
            'any.unknown': 'end_time must not be provided when status is closed'
        }),

    break_start: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .allow(null, '')
        .optional()
        .when('status', { 
            is: 'closed', 
            then: Joi.forbidden() 
        })
        .messages({
            'string.pattern.base': 'break_start must be in HH:MM format (e.g. 12:00)',
            'any.unknown': 'break_start must not be provided when status is closed'
        }),

    break_end: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .allow(null, '')
        .optional()
        .when('status', { 
            is: 'closed', 
            then: Joi.forbidden() 
        })
        .messages({
            'string.pattern.base': 'break_end must be in HH:MM format (e.g. 13:00)',
            'any.unknown': 'break_end must not be provided when status is closed'
        })
}).min(1).messages({
    'object.min': 'At least one field is required to update'
});

export const getAvailableSlotsSchema = Joi.object({
    provider_id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.empty': 'provider_id is required',
            'string.guid': 'provider_id must be a valid UUID'
        }),

    service_id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.empty': 'service_id is required',
            'string.guid': 'service_id must be a valid UUID'
        }),

    date: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
            'string.empty': 'date is required',
            'string.pattern.base': 'date must be in YYYY-MM-DD format'
        })
});
