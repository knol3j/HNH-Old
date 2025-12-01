/**
 * Tests for validation middleware
 */
const Joi = require('joi');
const { validate, sanitize, sanitizeString, sanitizeObject } = require('../../../api/middleware/validation');

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should pass validation with valid body', () => {
      const schema = {
        body: Joi.object({
          email: Joi.string().email().required(),
          age: Joi.number().integer().min(0)
        })
      };

      req.body = {
        email: 'test@example.com',
        age: 25
      };

      const middleware = validate(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid body', () => {
      const schema = {
        body: Joi.object({
          email: Joi.string().email().required(),
          age: Joi.number().integer().min(0).required()
        })
      };

      req.body = {
        email: 'invalid-email',
        age: -5
      };

      const middleware = validate(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              location: 'body'
            })
          ])
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate params', () => {
      const schema = {
        params: Joi.object({
          id: Joi.string().uuid().required()
        })
      };

      req.params = {
        id: 'invalid-uuid'
      };

      const middleware = validate(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              location: 'params'
            })
          ])
        })
      );
    });

    it('should validate query parameters', () => {
      const schema = {
        query: Joi.object({
          page: Joi.number().integer().min(1),
          limit: Joi.number().integer().min(1).max(100)
        })
      };

      req.query = {
        page: '0',
        limit: '200'
      };

      const middleware = validate(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              location: 'query'
            })
          ])
        })
      );
    });

    it('should strip unknown fields', () => {
      const schema = {
        body: Joi.object({
          email: Joi.string().email().required()
        })
      };

      req.body = {
        email: 'test@example.com',
        extraField: 'should-be-removed'
      };

      const middleware = validate(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should convert types', () => {
      const schema = {
        query: Joi.object({
          page: Joi.number().integer()
        })
      };

      req.query = {
        page: '5' // String should be converted to number
      };

      const middleware = validate(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle multiple validation errors', () => {
      const schema = {
        body: Joi.object({
          email: Joi.string().email().required(),
          username: Joi.string().min(3).required(),
          age: Joi.number().integer().min(0).required()
        })
      };

      req.body = {
        email: 'invalid',
        username: 'ab',
        age: -1
      };

      const middleware = validate(schema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'email' }),
            expect.objectContaining({ field: 'username' }),
            expect.objectContaining({ field: 'age' })
          ])
        })
      );
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove XSS characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should limit string length', () => {
      const longString = 'a'.repeat(15000);
      const result = sanitizeString(longString);
      expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(123)).toBe(123);
      expect(sanitizeString(null)).toBe(null);
      expect(sanitizeString(undefined)).toBe(undefined);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string fields', () => {
      const obj = {
        name: '  John  ',
        bio: '<script>xss</script>',
        age: 25
      };

      const result = sanitizeObject(obj);

      expect(result.name).toBe('John');
      expect(result.bio).not.toContain('<script>');
      expect(result.age).toBe(25);
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          name: '  Jane  ',
          details: {
            bio: '<b>bold</b>'
          }
        }
      };

      const result = sanitizeObject(obj);

      expect(result.user.name).toBe('Jane');
      expect(result.user.details.bio).toBe('bbold/b');
    });

    it('should handle arrays', () => {
      const obj = {
        tags: ['  tag1  ', '<script>xss</script>', 'tag3']
      };

      const result = sanitizeObject(obj);

      expect(result.tags[0]).toBe('tag1');
      expect(result.tags[1]).not.toContain('<script>');
      expect(result.tags[2]).toBe('tag3');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });
  });

  describe('sanitize middleware', () => {
    it('should sanitize request body', () => {
      req.body = {
        name: '  John  ',
        bio: '<script>xss</script>'
      };

      sanitize(req, res, next);

      expect(req.body.name).toBe('John');
      expect(req.body.bio).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      req.query = {
        search: '  query  ',
        filter: '<b>test</b>'
      };

      sanitize(req, res, next);

      expect(req.query.search).toBe('query');
      expect(req.query.filter).toBe('btest/b');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize params', () => {
      req.params = {
        id: '  123  '
      };

      sanitize(req, res, next);

      expect(req.params.id).toBe('123');
      expect(next).toHaveBeenCalled();
    });
  });
});
