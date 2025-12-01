/**
 * Joi validation schemas for Community endpoints
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

const usernameSchema = Joi.string()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .required()
  .messages({
    'string.pattern.base': 'Username can only contain alphanumeric characters, hyphens, and underscores',
    'any.required': 'Username is required'
  });

const walletAddressSchema = Joi.string()
  .pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  .messages({
    'string.pattern.base': 'Invalid wallet address format'
  });

const socialUsernameSchema = Joi.string()
  .min(1)
  .max(100)
  .pattern(/^[a-zA-Z0-9_.-]+$/)
  .messages({
    'string.pattern.base': 'Invalid username format'
  });

// Register community member schema
const registerCommunityMemberSchema = {
  body: Joi.object({
    email: emailSchema,
    username: usernameSchema,
    fullName: Joi.string().min(2).max(200).optional(),
    walletAddress: walletAddressSchema.optional(),
    discordUsername: socialUsernameSchema.optional(),
    telegramUsername: socialUsernameSchema.optional(),
    twitterUsername: socialUsernameSchema.optional(),
    githubUsername: socialUsernameSchema.optional(),
    bio: Joi.string().max(1000).optional(),
    country: Joi.string().max(100).optional(),
    timezone: Joi.string().max(100).optional(),
    interests: Joi.array()
      .items(Joi.string().max(100))
      .max(20)
      .optional()
      .default([]),
    skills: Joi.array()
      .items(Joi.string().max(100))
      .max(50)
      .optional()
      .default([]),
    contributionAreas: Joi.array()
      .items(Joi.string().valid(
        'development',
        'documentation',
        'community_management',
        'marketing',
        'design',
        'testing',
        'translation',
        'education',
        'research',
        'other'
      ))
      .max(10)
      .optional()
      .default([]),
    stackUserId: Joi.string().max(100).optional()
  })
};

// Get community member schema
const getCommunityMemberSchema = {
  params: Joi.object({
    id: uuidSchema.required()
  })
};

// Update community member schema
const updateCommunityMemberSchema = {
  params: Joi.object({
    id: uuidSchema.required()
  }),
  body: Joi.object({
    username: usernameSchema.optional(),
    fullName: Joi.string().min(2).max(200),
    walletAddress: walletAddressSchema,
    discordUsername: socialUsernameSchema,
    telegramUsername: socialUsernameSchema,
    twitterUsername: socialUsernameSchema,
    githubUsername: socialUsernameSchema,
    bio: Joi.string().max(1000),
    avatarUrl: Joi.string().uri().max(500),
    country: Joi.string().max(100),
    timezone: Joi.string().max(100),
    interests: Joi.array().items(Joi.string().max(100)).max(20),
    skills: Joi.array().items(Joi.string().max(100)).max(50),
    contributionAreas: Joi.array()
      .items(Joi.string().valid(
        'development',
        'documentation',
        'community_management',
        'marketing',
        'design',
        'testing',
        'translation',
        'education',
        'research',
        'other'
      ))
      .max(10)
  }).min(1) // At least one field must be present
};

// List community members schema
const listCommunityMembersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'active', 'inactive', 'suspended').default('active'),
    search: Joi.string().max(200).optional()
  })
};

module.exports = {
  registerCommunityMemberSchema,
  getCommunityMemberSchema,
  updateCommunityMemberSchema,
  listCommunityMembersSchema
};
