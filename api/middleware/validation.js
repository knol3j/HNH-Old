/**
 * Validation middleware using Joi
 * Provides centralized request validation for all API endpoints
 */
const Joi = require('joi');

/**
 * Validates request body/params/query against a Joi schema
 * @param {Object} schema - Object containing schemas for body, params, and/or query
 * @returns {Function} Express middleware function
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
          location: 'body'
        })));
      }
    }

    // Validate URL parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: false
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
          location: 'params'
        })));
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
          location: 'query'
        })));
      }
    }

    // If validation errors exist, return 400 response
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

/**
 * Sanitizes string input by trimming whitespace and removing dangerous characters
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS characters
    .substring(0, 10000); // Limit length
}

/**
 * Sanitizes all string fields in an object recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Middleware to sanitize all request inputs
 */
function sanitize(req, res, next) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

module.exports = {
  validate,
  sanitize,
  sanitizeString,
  sanitizeObject
};
