#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const crypto = require('crypto');
const chalk = require('chalk');
const os = require('os');
// Note: fetch is available globally in Node.js 18+

// Configuration
const POOL_API_URL = process.env.POOL_API_URL || 'https://hashnhedge-pool.onrender.com';
const POOL_API_KEY = process.env.POOL_API_KEY || 'hnh_5c9543830e15266d9427a336162e945b5ff76d8b4ac86f64efb9778a6ca57762';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || 'GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc';
const WORKER_NAME = process.env.WORKER_NAME || 'cli-miner-' + os.hostname();

// Worker credentials (will be set after registration)
let workerCredentials = {
  workerId: WORKER_NAME,
  secret: null,
  registered: false
};

// Mining stats
const stats = {
  sharesSubmitted: 0,
  sharesAccepted: 0,
  sharesRejected: 0,
  hashrate: 0,
  startTime: Date.now(),
  lastShareTime: 0
};

let currentJob = null;
let miningActive = false;
let hashCounter = 0;
let hashrateInterval = null;

// Console colors
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠'), msg),
  share: (msg) => console.log(chalk.magenta('⛏'), msg),
  stats: (msg) => console.log(chalk.cyan('📊'), msg)
};

// SHA256 mining function
function mine(job) {
  const { blockData, difficulty, jobId } = job;
  let nonce = Math.floor(Math.random() * 0xFFFFFFFF);
  const maxAttempts = 100000; // Check 100k hashes before yielding

  for (let i = 0; i < maxAttempts; i++) {
    const data = blockData + nonce.toString(16).padStart(8, '0');
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    hashCounter++;

    // Check if hash meets difficulty (leading zeros)
    if (hash.startsWith('0'.repeat(difficulty))) {
      return { nonce, hash, jobId };
    }

    nonce++;
  }

  return null; // No solution found in this batch
}

// Submit share to pool
async function submitShare(share) {
  if (!workerCredentials.registered) {
    log.error('Worker not registered, cannot submit share');
    return;
  }

  stats.sharesSubmitted++;
  log.share(`Submitting share: ${chalk.bold(share.hash.substring(0, 16))}...`);

  // Submit to API
  await submitShareToAPI(share);
}

// Mining loop
function startMining() {
  if (!currentJob || miningActive) return;

  miningActive = true;

  function mineLoop() {
    if (!miningActive || !currentJob) return;

    const solution = mine(currentJob);

    if (solution) {
      submitShare(solution);
    }

    // Continue mining with setImmediate for non-blocking
    setImmediate(mineLoop);
  }

  mineLoop();
}

function stopMining() {
  miningActive = false;
}

// Calculate and display hashrate
function updateHashrate() {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  stats.hashrate = Math.floor(hashCounter / elapsed);
  hashCounter = 0;
  stats.startTime = Date.now();
}

// Display statistics
function displayStats() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const acceptRate = stats.sharesSubmitted > 0
    ? ((stats.sharesAccepted / stats.sharesSubmitted) * 100).toFixed(2)
    : '0.00';

  console.clear();
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════'));
  console.log(chalk.bold.white('           HASHNHEDGE POOL MINER'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════'));
  console.log();
  console.log(chalk.white('Pool:       ') + chalk.yellow(POOL_API_URL));
  console.log(chalk.white('Wallet:     ') + chalk.yellow(WALLET_ADDRESS));
  console.log(chalk.white('Worker:     ') + chalk.yellow(workerCredentials.workerId));
  console.log();
  console.log(chalk.bold.cyan('───────────────────────────────────────────────────────────'));
  console.log(chalk.bold.white('  Mining Statistics'));
  console.log(chalk.bold.cyan('───────────────────────────────────────────────────────────'));
  console.log(chalk.white('Hashrate:          ') + chalk.green(stats.hashrate.toLocaleString()) + chalk.white(' H/s'));
  console.log(chalk.white('Shares Submitted:  ') + chalk.blue(stats.sharesSubmitted));
  console.log(chalk.white('Shares Accepted:   ') + chalk.green(stats.sharesAccepted));
  console.log(chalk.white('Shares Rejected:   ') + chalk.red(stats.sharesRejected));
  console.log(chalk.white('Accept Rate:       ') + chalk.cyan(acceptRate + '%'));
  console.log(chalk.white('Uptime:            ') + chalk.magenta(formatUptime(uptime)));
  console.log();

  if (currentJob) {
    console.log(chalk.bold.cyan('───────────────────────────────────────────────────────────'));
    console.log(chalk.bold.white('  Current Job'));
    console.log(chalk.bold.cyan('───────────────────────────────────────────────────────────'));
    console.log(chalk.white('Job ID:       ') + chalk.yellow(currentJob.jobId));
    console.log(chalk.white('Difficulty:   ') + chalk.yellow(currentJob.difficulty));
    console.log(chalk.white('Target:       ') + chalk.yellow('0'.repeat(currentJob.difficulty) + '...'));
  }

  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════'));
  console.log();
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

// Generate common headers for API requests
function getHeaders(includeAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Add API key if available
  if (POOL_API_KEY) {
    headers['X-API-Key'] = POOL_API_KEY;
  }

  // Add worker authentication if requested and available
  if (includeAuth && workerCredentials.secret) {
    const timestamp = Date.now();
    const signature = generateAuthSignature(
      workerCredentials.workerId,
      timestamp,
      workerCredentials.secret
    );
    headers['X-Worker-ID'] = workerCredentials.workerId;
    headers['X-Worker-Timestamp'] = timestamp.toString();
    headers['X-Worker-Signature'] = signature;
  }

  return headers;
}

// Generate HMAC signature for authentication
function generateAuthSignature(workerId, timestamp, secret) {
  const message = `${workerId}:${timestamp}`;
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

// Register worker with the pool API
async function registerWorker() {
  try {
    log.info('Registering with pool...');

    const hardwareInfo = {
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      memory: os.totalmem(),
      hostname: os.hostname()
    };

    const response = await fetch(`${POOL_API_URL}/api/worker/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        workerId: WORKER_NAME,
        walletAddress: WALLET_ADDRESS,
        hardwareInfo
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        log.warning('Worker already registered, attempting to use cached credentials...');
        // Worker already exists, we'll try to connect without signature
        workerCredentials.registered = true;
        workerCredentials.secret = WALLET_ADDRESS; // Fallback to wallet address
        return true;
      }
      throw new Error(data.error || 'Registration failed');
    }

    // Store credentials
    workerCredentials.workerId = data.data.workerId;
    workerCredentials.secret = data.authentication.secret;
    workerCredentials.registered = true;

    log.success(`Worker registered! ID: ${workerCredentials.workerId}`);
    log.info(`Auth secret: ${workerCredentials.secret.substring(0, 16)}...`);
    log.warning('Save your secret if you need to restart the miner!');

    return true;
  } catch (error) {
    log.error(`Registration failed: ${error.message}`);
    return false;
  }
}

// Send heartbeat to keep worker alive
async function sendHeartbeat() {
  try {
    const response = await fetch(
      `${POOL_API_URL}/api/worker/${workerCredentials.workerId}/heartbeat`,
      {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          status: 'active',
          hardwareInfo: {
            hashrate: stats.hashrate,
            shares: stats.sharesSubmitted,
            uptime: Math.floor((Date.now() - stats.startTime) / 1000)
          }
        })
      }
    );

    if (!response.ok) {
      log.warning('Heartbeat failed, worker may be marked inactive');
    }
  } catch (error) {
    log.warning(`Heartbeat error: ${error.message}`);
  }
}

// Submit share to pool via API
async function submitShareToAPI(share) {
  try {
    const response = await fetch(
      `${POOL_API_URL}/api/worker/${workerCredentials.workerId}/shares`,
      {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          jobId: share.jobId,
          difficulty: currentJob.difficulty,
          nonce: share.nonce,
          hash: share.hash,
          jobType: 'mining'
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Share submission failed');
    }

    stats.lastShareTime = Date.now();

    if (data.data.isValid) {
      stats.sharesAccepted++;
      log.success(`Share ACCEPTED! Hash: ${share.hash.substring(0, 16)}...`);
    } else {
      stats.sharesRejected++;
      log.error(`Share REJECTED! Hash: ${share.hash.substring(0, 16)}...`);
    }

    return data.data.isValid;
  } catch (error) {
    log.error(`Share submission error: ${error.message}`);
    stats.sharesRejected++;
    return false;
  }
}

// Get mining jobs from pool
async function getJobs() {
  try {
    const response = await fetch(
      `${POOL_API_URL}/api/worker/${workerCredentials.workerId}/jobs`,
      {
        method: 'GET',
        headers: getHeaders(true)
      }
    );

    const data = await response.json();

    if (response.ok && data.data && data.data.length > 0) {
      const job = data.data[0];
      log.info(`New job received: ${job.jobId}`);

      stopMining();
      currentJob = {
        jobId: job.jobId,
        blockData: job.blockData || crypto.randomBytes(32).toString('hex'),
        difficulty: job.difficulty || 4,
        target: job.target
      };
      startMining();
      displayStats();
    } else {
      // If no jobs available, create a practice job
      if (!currentJob) {
        log.warning('No jobs available, mining practice blocks...');
        currentJob = {
          jobId: `practice-${Date.now()}`,
          blockData: crypto.randomBytes(32).toString('hex'),
          difficulty: 4,
          target: '0'.repeat(4)
        };
        startMining();
      }
    }
  } catch (error) {
    log.warning(`Failed to get jobs: ${error.message}`);
    // Continue with practice mining
    if (!currentJob) {
      currentJob = {
        jobId: `practice-${Date.now()}`,
        blockData: crypto.randomBytes(32).toString('hex'),
        difficulty: 4,
        target: '0'.repeat(4)
      };
      startMining();
    }
  }
}

// Connect to pool using API
async function connect() {
  log.info(`Connecting to pool: ${POOL_API_URL}`);

  // Register worker
  const registered = await registerWorker();
  if (!registered) {
    log.error('Failed to register with pool. Retrying in 10 seconds...');
    setTimeout(connect, 10000);
    return;
  }

  log.success('Connected to pool!');

  // Start hashrate calculation
  hashrateInterval = setInterval(() => {
    updateHashrate();
    displayStats();
  }, 2000);

  // Get initial job
  await getJobs();

  // Poll for new jobs every 30 seconds
  const jobPollInterval = setInterval(() => {
    getJobs();
  }, 30000);

  // Send heartbeat every 60 seconds
  const heartbeatInterval = setInterval(() => {
    sendHeartbeat();
  }, 60000);

  // Store intervals for cleanup
  global.poolIntervals = {
    hashrate: hashrateInterval,
    jobPoll: jobPollInterval,
    heartbeat: heartbeatInterval
  };
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log();
  log.info('Shutting down miner...');
  stopMining();

  // Clean up intervals
  if (global.poolIntervals) {
    clearInterval(global.poolIntervals.hashrate);
    clearInterval(global.poolIntervals.jobPoll);
    clearInterval(global.poolIntervals.heartbeat);
  }

  console.log();
  log.stats('Final Statistics:');
  console.log(`  Shares Submitted: ${stats.sharesSubmitted}`);
  console.log(`  Shares Accepted:  ${stats.sharesAccepted}`);
  console.log(`  Shares Rejected:  ${stats.sharesRejected}`);
  console.log(`  Final Hashrate:   ${stats.hashrate.toLocaleString()} H/s`);
  console.log();
  log.success('Goodbye!');
  process.exit(0);
});

// Start
console.log(chalk.bold.cyan('\n🚀 Starting HashNHedge Pool Miner...\n'));

// Check for API key
if (!POOL_API_KEY) {
  console.log(chalk.yellow('⚠️  Warning: No POOL_API_KEY environment variable set.'));
  console.log(chalk.yellow('   The pool may require an API key for access.\n'));
  console.log(chalk.white('   To generate an API key, run:'));
  console.log(chalk.cyan('   node generate-pool-api-key.js\n'));
  console.log(chalk.white('   Then set the environment variable:'));
  console.log(chalk.cyan('   export POOL_API_KEY="your_generated_key"\n'));
}

connect();
