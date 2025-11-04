#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const WebSocket = require('ws');
const crypto = require('crypto');
const chalk = require('chalk');
const os = require('os');

// Configuration
const POOL_WS_URL = process.env.POOL_WS_URL || 'wss://hashnhedge-pool.onrender.com';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || 'GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc';
const WORKER_NAME = process.env.WORKER_NAME || 'cli-miner-' + os.hostname();

// Miner state
let minerId = null;
let ws = null;

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
function submitShare(share) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    log.error('WebSocket not connected, cannot submit share');
    return;
  }

  stats.sharesSubmitted++;
  log.share(`Submitting share: ${chalk.bold(share.hash.substring(0, 16))}...`);

  // Submit share using pool server's protocol
  ws.send(JSON.stringify({
    type: 'submit',
    jobId: share.jobId,
    nonce: share.nonce,
    hash: share.hash
  }));
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
  console.log(chalk.white('Pool:       ') + chalk.yellow(POOL_WS_URL));
  console.log(chalk.white('Wallet:     ') + chalk.yellow(WALLET_ADDRESS));
  console.log(chalk.white('Miner ID:   ') + chalk.yellow(minerId || 'Connecting...'));
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

// Connect to pool via WebSocket
function connect() {
  log.info(`Connecting to pool: ${POOL_WS_URL}`);

  ws = new WebSocket(POOL_WS_URL);

  ws.on('open', () => {
    log.success('Connected to pool!');

    // Register with pool (using pool server's protocol)
    ws.send(JSON.stringify({
      type: 'register',
      wallet: WALLET_ADDRESS,
      worker: WORKER_NAME,
      deviceInfo: {
        platform: 'desktop',
        cores: require('os').cpus().length
      }
    }));

    // Start hashrate calculation and display
    hashrateInterval = setInterval(() => {
      updateHashrate();
      displayStats();
    }, 2000);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      // Handle stats update
      if (message.type === 'stats') {
        // Pool sent initial stats
        log.info(`Pool stats: ${message.data.activeMiners} miners, ${message.data.totalHashrate} H/s`);
      }

      // Handle new mining job
      if (message.type === 'job') {
        if (!minerId) {
          minerId = WORKER_NAME; // Use worker name as miner ID
          log.success(`Registered as: ${chalk.bold(minerId)}`);
        }
        log.info(`New job received: ${chalk.bold(message.jobId)}`);
        stopMining();
        currentJob = {
          jobId: message.jobId,
          blockData: message.blockData,
          difficulty: message.difficulty,
          target: message.target
        };
        startMining();
        displayStats();
      }

      // Handle share accepted
      if (message.type === 'share_accepted') {
        stats.sharesAccepted++;
        log.success(chalk.bold('SHARE ACCEPTED! ') + `Reward: ${message.reward}`);
        displayStats();
      }

      // Handle share rejected
      if (message.type === 'share_rejected') {
        stats.sharesRejected++;
        log.error(`SHARE REJECTED: ${message.reason}`);
        displayStats();
      }

      // Handle errors
      if (message.type === 'error') {
        log.error(`Pool error: ${message.message}`);
      }

    } catch (err) {
      log.error(`Failed to parse message: ${err.message}`);
    }
  });

  ws.on('error', (error) => {
    log.error(`WebSocket error: ${error.message}`);
  });

  ws.on('close', () => {
    log.warning('Disconnected from pool');
    stopMining();

    if (hashrateInterval) {
      clearInterval(hashrateInterval);
    }

    // Reconnect after 5 seconds
    log.info('Reconnecting in 5 seconds...');
    setTimeout(connect, 5000);
  });
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log();
  log.info('Shutting down miner...');
  stopMining();

  if (ws) {
    ws.close();
  }

  if (hashrateInterval) {
    clearInterval(hashrateInterval);
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
connect();
