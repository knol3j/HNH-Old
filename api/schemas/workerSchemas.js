/**
 * Joi validation schemas for Worker/Miner endpoints
 */
const Joi = require('joi');

// Common schemas
const walletAddressSchema = Joi.string()
  .pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid wallet address format',
    'any.required': 'Wallet address is required'
  });

const workerIdSchema = Joi.string()
  .min(3)
  .max(100)
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .required()
  .messages({
    'string.pattern.base': 'Worker ID can only contain alphanumeric characters, hyphens, and underscores',
    'any.required': 'Worker ID is required'
  });

const uuidSchema = Joi.string()
  .uuid()
  .required()
  .messages({
    'string.guid': 'Invalid ID format',
    'any.required': 'ID is required'
  });

// Register worker schema
const registerWorkerSchema = {
  body: Joi.object({
    workerId: workerIdSchema,
    walletAddress: walletAddressSchema,
    hardwareInfo: Joi.object({
      gpuCount: Joi.number().integer().min(0).max(100),
      gpuModel: Joi.string().max(200),
      cpuModel: Joi.string().max(200),
      ramGB: Joi.number().min(0).max(10000),
      hashrate: Joi.number().min(0),
      osType: Joi.string().max(100),
      driverVersion: Joi.string().max(100)
    }).optional()
  })
};

// Worker heartbeat schema
const workerHeartbeatSchema = {
  params: Joi.object({
    workerId: workerIdSchema
  }),
  body: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'offline').optional(),
    hardwareInfo: Joi.object({
      gpuCount: Joi.number().integer().min(0).max(100),
      gpuModel: Joi.string().max(200),
      cpuModel: Joi.string().max(200),
      ramGB: Joi.number().min(0).max(10000),
      hashrate: Joi.number().min(0),
      temperature: Joi.number().min(0).max(200),
      powerUsage: Joi.number().min(0),
      osType: Joi.string().max(100),
      driverVersion: Joi.string().max(100)
    }).optional()
  })
};

// Get worker stats schema
const getWorkerStatsSchema = {
  params: Joi.object({
    workerId: workerIdSchema
  })
};

// Get available jobs schema
const getAvailableJobsSchema = {
  params: Joi.object({
    workerId: workerIdSchema
  }),
  query: Joi.object({
    jobType: Joi.string().valid('mining', 'ai', 'compute', 'rendering').optional(),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

// Claim job schema
const claimJobSchema = {
  params: Joi.object({
    workerId: workerIdSchema,
    jobId: uuidSchema
  })
};

// Submit share schema
const submitShareSchema = {
  params: Joi.object({
    workerId: workerIdSchema
  }),
  body: Joi.object({
    jobId: uuidSchema,
    difficulty: Joi.number().integer().min(1).required(),
    nonce: Joi.string().max(200).required(),
    hash: Joi.string().pattern(/^[a-fA-F0-9]+$/).min(32).max(128).required(),
    jobType: Joi.string().valid('mining', 'ai', 'compute', 'rendering').required()
  })
};

// List workers schema
const listWorkersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('active', 'inactive', 'offline').optional()
  })
};

module.exports = {
  registerWorkerSchema,
  workerHeartbeatSchema,
  getWorkerStatsSchema,
  getAvailableJobsSchema,
  claimJobSchema,
  submitShareSchema,
  listWorkersSchema
};
