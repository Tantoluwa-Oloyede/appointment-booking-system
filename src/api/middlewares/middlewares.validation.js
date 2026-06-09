export const validateBody = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'Validation failed',
                errors: error.details.map(err => err.message)
            });
        }
        req.body = value; // replace req.body with stripped/validated values
        next();
    };
};

export const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
        if (error) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'Validation failed',
                errors: error.details.map(err => err.message)
            });
        }
        req.query = value;
        next();
    };
};

export const validateParams = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, { abortEarly: false, stripUnknown: true });
        if (error) {
            return res.status(422).json({
                status: 'error',
                code: 422,
                message: 'Validation failed',
                errors: error.details.map(err => err.message)
            });
        }
        req.params = value;
        next();
    };
};
