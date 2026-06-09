import Joi from 'joi';

export const createBookingSchema = Joi.object({
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

    start_at: Joi.string()
        .isoDate()
        .required()
        .messages({
            'string.empty': 'start_at is required',
            'string.isoDate': 'start_at must be a valid ISO date string e.g. 2026-05-12T08:00:00.000Z'
        }),

    notes: Joi.string()
        .trim()
        .max(1000)
        .allow(null, '')
        .optional()
});

export const cancelBookingSchema = Joi.object({
    reason: Joi.string()
        .trim()
        .max(500)
        .allow(null, '')
        .optional()
});
