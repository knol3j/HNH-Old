#!/usr/bin/env node
/**
 * Wrapper script to start the Hybrid Pool from repository root
 * This allows Railway to deploy from root while running the correct service
 */

const { spawn } = require('child_process');
const path = require('path');

// Change to hybrid-pool directory
const hybridPoolDir = path.join(__dirname, 'hybrid-pool');
console.log(`🚀 Starting HashNHedge Hybrid Pool from: ${hybridPoolDir}`);

// Start the hybrid pool
const pool = spawn('node', ['index.js'], {
    cwd: hybridPoolDir,
    stdio: 'inherit',
    env: process.env
});

pool.on('error', (err) => {
    console.error('❌ Failed to start hybrid pool:', err);
    process.exit(1);
});

pool.on('exit', (code) => {
    console.log(`Hybrid pool exited with code ${code}`);
    process.exit(code || 0);
});

// Handle shutdown signals
process.on('SIGINT', () => {
    console.log('\n⚠️  Received SIGINT, shutting down...');
    pool.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('\n⚠️  Received SIGTERM, shutting down...');
    pool.kill('SIGTERM');
});
