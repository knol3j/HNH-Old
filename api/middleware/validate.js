/**
 * Input validation middleware using Joi
 */
const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Generic validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown keys from the validated data
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('[VALIDATION] Input validation failed:', { errors, path: req.path });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request property with validated/sanitized value
    req[property] = value;
    next();
  };
};

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

// Community Member Validation
const communityMemberRegisterSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_-]+$/).required(),
  fullName: Joi.string().min(1).max(100).optional(),
  walletAddress: Joi.string().pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).optional(),
  discordUsername: Joi.string().max(50).optional(),
  telegramUsername: Joi.string().max(50).optional(),
  twitterUsername: Joi.string().max(50).optional(),
  githubUsername: Joi.string().max(50).optional(),
  bio: Joi.string().max(500).optional(),
  country: Joi.string().max(100).optional(),
  timezone: Joi.string().max(100).optional(),
  interests: Joi.array().items(Joi.string().max(50)).optional(),
  skills: Joi.array().items(Joi.string().max(50)).optional(),
  contributionAreas: Joi.array().items(Joi.string().max(50)).optional(),
  stackUserId: Joi.string().optional()
});

const communityMemberUpdateSchema = Joi.object({
  username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_-]+$/).optional(),
  fullName: Joi.string().min(1).max(100).optional(),
  walletAddress: Joi.string().pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).optional(),
  discordUsername: Joi.string().max(50).allow('', null).optional(),
  telegramUsername: Joi.string().max(50).allow('', null).optional(),
  twitterUsername: Joi.string().max(50).allow('', null).optional(),
  githubUsername: Joi.string().max(50).allow('', null).optional(),
  bio: Joi.string().max(500).allow('', null).optional(),
  country: Joi.string().max(100).allow('', null).optional(),
  timezone: Joi.string().max(100).allow('', null).optional(),
  interests: Joi.array().items(Joi.string().max(50)).optional(),
  skills: Joi.array().items(Joi.string().max(50)).optional(),
  contributionAreas: Joi.array().items(Joi.string().max(50)).optional(),
  avatarUrl: Joi.string().uri().allow('', null).optional()
});

// Vendor Validation
const vendorRegisterSchema = Joi.object({
  companyName: Joi.string().min(1).max(200).required(),
  legalName: Joi.string().max(200).optional(),
  registrationNumber: Joi.string().max(100).optional(),
  taxId: Joi.string().max(100).optional(),
  contactEmail: Joi.string().email().required(),
  contactPhone: Joi.string().max(50).optional(),
  websiteUrl: Joi.string().uri().optional(),
  contactPersonName: Joi.string().min(1).max(100).required(),
  contactPersonTitle: Joi.string().max(100).optional(),
  contactPersonEmail: Joi.string().email().optional(),
  businessType: Joi.string().valid('hardware', 'software', 'service', 'other').optional(),
  industrySector: Joi.string().max(100).optional(),
  companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '500+').optional(),
  establishedYear: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
  addressLine1: Joi.string().max(200).optional(),
  addressLine2: Joi.string().max(200).allow('', null).optional(),
  city: Joi.string().max(100).optional(),
  stateProvince: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  paymentWalletAddress: Joi.string().pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).optional(),
  partnershipType: Joi.string().valid('reseller', 'integrator', 'affiliate', 'technology_partner').optional(),
  productsServices: Joi.string().max(500).optional(),
  integrationInterest: Joi.array().items(Joi.string().max(100)).optional(),
  expectedVolume: Joi.string().max(100).optional(),
  termsAccepted: Joi.boolean().valid(true).required(),
  stackUserId: Joi.string().optional()
});

const vendorUpdateSchema = Joi.object({
  contactEmail: Joi.string().email().optional(),
  contactPhone: Joi.string().max(50).allow('', null).optional(),
  websiteUrl: Joi.string().uri().allow('', null).optional(),
  contactPersonName: Joi.string().min(1).max(100).optional(),
  contactPersonTitle: Joi.string().max(100).allow('', null).optional(),
  contactPersonEmail: Joi.string().email().allow('', null).optional(),
  addressLine1: Joi.string().max(200).optional(),
  addressLine2: Joi.string().max(200).allow('', null).optional(),
  city: Joi.string().max(100).optional(),
  stateProvince: Joi.string().max(100).optional(),
  postalCode: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  paymentWalletAddress: Joi.string().pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).allow('', null).optional(),
  productsServices: Joi.string().max(500).allow('', null).optional(),
  integrationInterest: Joi.array().items(Joi.string().max(100)).optional()
});

// Worker Validation
const workerRegisterSchema = Joi.object({
  workerId: Joi.string().min(3).max(100).required(),
  walletAddress: Joi.string().pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).required(),
  hardwareInfo: Joi.object({
    gpuCount: Joi.number().integer().min(0).optional(),
    gpuType: Joi.string().max(100).optional(),
    cpuModel: Joi.string().max(100).optional(),
    ramGB: Joi.number().min(0).optional(),
    hashrate: Joi.number().min(0).optional(),
    location: Joi.string().max(100).optional()
  }).optional()
});

const shareSubmitSchema = Joi.object({
  jobId: Joi.string().required(),
  difficulty: Joi.number().positive().required(),
  nonce: Joi.string().required(),
  hash: Joi.string().pattern(/^[0-9a-fA-F]{64}$/).required(),
  jobType: Joi.string().valid('mining', 'ai_training', 'rendering', 'other').required()
});

// Pagination Validation
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().optional(),
  search: Joi.string().max(100).optional()
});

module.exports = {
  validate,
  schemas: {
    communityMemberRegister: communityMemberRegisterSchema,
    communityMemberUpdate: communityMemberUpdateSchema,
    vendorRegister: vendorRegisterSchema,
    vendorUpdate: vendorUpdateSchema,
    workerRegister: workerRegisterSchema,
    shareSubmit: shareSubmitSchema,
    pagination: paginationSchema
  }
};
