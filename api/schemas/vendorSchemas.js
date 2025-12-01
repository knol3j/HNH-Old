/**
 * Joi validation schemas for Vendor endpoints
 */
const Joi = require('joi');

const uuidSchema = Joi.string().uuid();

const emailSchema = Joi.string()
  .email()
  .max(255)
  .required()
  .messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required'
  });

const phoneSchema = Joi.string()
  .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
  .messages({
    'string.pattern.base': 'Invalid phone number format'
  });

const urlSchema = Joi.string()
  .uri()
  .max(500)
  .messages({
    'string.uri': 'Invalid URL format'
  });

const walletAddressSchema = Joi.string()
  .pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  .messages({
    'string.pattern.base': 'Invalid wallet address format'
  });

// Register vendor schema
const registerVendorSchema = {
  body: Joi.object({
    companyName: Joi.string().min(2).max(200).required(),
    legalName: Joi.string().max(200).optional(),
    registrationNumber: Joi.string().max(100).optional(),
    taxId: Joi.string().max(100).optional(),
    contactEmail: emailSchema,
    contactPhone: phoneSchema.optional(),
    websiteUrl: urlSchema.optional(),
    contactPersonName: Joi.string().min(2).max(200).required(),
    contactPersonTitle: Joi.string().max(100).optional(),
    contactPersonEmail: emailSchema.optional(),
    businessType: Joi.string()
      .valid('corporation', 'llc', 'partnership', 'sole_proprietorship', 'non_profit', 'other')
      .optional(),
    industrySector: Joi.string().max(200).optional(),
    companySize: Joi.string()
      .valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')
      .optional(),
    establishedYear: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    addressLine1: Joi.string().max(500).optional(),
    addressLine2: Joi.string().max(500).optional(),
    city: Joi.string().max(100).optional(),
    stateProvince: Joi.string().max(100).optional(),
    postalCode: Joi.string().max(20).optional(),
    country: Joi.string().max(100).optional(),
    paymentWalletAddress: walletAddressSchema.optional(),
    partnershipType: Joi.string()
      .valid('reseller', 'technology_partner', 'integration_partner', 'affiliate', 'other')
      .optional(),
    productsServices: Joi.string().max(2000).optional(),
    integrationInterest: Joi.array().items(Joi.string().max(100)).max(20).optional(),
    expectedVolume: Joi.string().max(500).optional(),
    termsAccepted: Joi.boolean().valid(true).required(),
    stackUserId: Joi.string().max(100).optional()
  })
};

// Get vendor schema
const getVendorSchema = {
  params: Joi.object({
    id: uuidSchema.required()
  })
};

// Update vendor schema
const updateVendorSchema = {
  params: Joi.object({
    id: uuidSchema.required()
  }),
  body: Joi.object({
    legalName: Joi.string().max(200),
    contactPhone: phoneSchema,
    websiteUrl: urlSchema,
    contactPersonName: Joi.string().min(2).max(200),
    contactPersonTitle: Joi.string().max(100),
    contactPersonEmail: emailSchema,
    businessType: Joi.string()
      .valid('corporation', 'llc', 'partnership', 'sole_proprietorship', 'non_profit', 'other'),
    industrySector: Joi.string().max(200),
    companySize: Joi.string()
      .valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'),
    addressLine1: Joi.string().max(500),
    addressLine2: Joi.string().max(500),
    city: Joi.string().max(100),
    stateProvince: Joi.string().max(100),
    postalCode: Joi.string().max(20),
    country: Joi.string().max(100),
    paymentWalletAddress: walletAddressSchema,
    productsServices: Joi.string().max(2000),
    integrationInterest: Joi.array().items(Joi.string().max(100)).max(20),
    expectedVolume: Joi.string().max(500)
  }).min(1) // At least one field must be present
};

// List vendors schema
const listVendorsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'active', 'inactive', 'suspended').default('active'),
    businessType: Joi.string()
      .valid('corporation', 'llc', 'partnership', 'sole_proprietorship', 'non_profit', 'other')
      .optional(),
    partnershipType: Joi.string()
      .valid('reseller', 'technology_partner', 'integration_partner', 'affiliate', 'other')
      .optional(),
    search: Joi.string().max(200).optional()
  })
};

// Add vendor offering schema
const addVendorOfferingSchema = {
  params: Joi.object({
    vendorId: uuidSchema.required()
  }),
  body: Joi.object({
    offeringType: Joi.string()
      .valid('product', 'service', 'api', 'integration', 'consulting', 'other')
      .required(),
    name: Joi.string().min(2).max(200).required(),
    description: Joi.string().max(5000).optional(),
    category: Joi.string().max(100).optional(),
    pricingModel: Joi.string()
      .valid('one_time', 'subscription', 'usage_based', 'custom', 'free')
      .optional(),
    basePrice: Joi.number().min(0).optional(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    documentationUrl: urlSchema.optional(),
    demoUrl: urlSchema.optional(),
    purchaseUrl: urlSchema.optional()
  })
};

module.exports = {
  registerVendorSchema,
  getVendorSchema,
  updateVendorSchema,
  listVendorsSchema,
  addVendorOfferingSchema
};
