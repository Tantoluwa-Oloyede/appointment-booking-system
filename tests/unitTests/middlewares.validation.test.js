import { validateBody, validateQuery, validateParams } from '../../src/api/middlewares/middlewares.validation.js';
import Joi from 'joi';

describe('Validation Middleware Unit Tests', () => {
  let req, res, next;
  const testSchema = Joi.object({
    username: Joi.string().min(3).required(),
    age: Joi.number().integer().min(18)
  });

  beforeEach(() => {
    req = { body: {}, query: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateBody', () => {
    it('should proceed if validation passes and strip unknown fields', () => {
      req.body = { username: 'john', age: 25, extra: 'forbidden' };
      const middleware = validateBody(testSchema);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ username: 'john', age: 25 }); // 'extra' should be stripped
    });

    it('should return 422 if validation fails', () => {
      req.body = { username: 'jo' }; // too short
      const middleware = validateBody(testSchema);

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Validation failed',
          errors: expect.any(Array)
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    it('should proceed if validation passes', () => {
      req.query = { username: 'john' };
      const middleware = validateQuery(testSchema);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('should proceed if validation passes', () => {
      req.params = { username: 'john' };
      const middleware = validateParams(testSchema);

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
