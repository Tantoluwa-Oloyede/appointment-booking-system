import Joi from 'joi';

/**
 * Validation middleware factory
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(422).json({
        status: 'error',
        code: 422,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};