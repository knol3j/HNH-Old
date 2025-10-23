#!/usr/bin/env node

/**
 * HashNHedge Setup Validation Script
 * Tests if the environment is properly configured
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔍 HashNHedge Setup Validation');
console.log('================================\n');

let totalTests = 0;
let passedTests = 0;
let criticalFailures = 0;

function test(name, fn, isCritical = false) {
  totalTests++;
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
      passedTests++;
      return true;
    } else {
      console.log(`❌ ${name}`);
      if (isCritical) criticalFailures++;
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    if (isCritical) criticalFailures++;
    return false;
  }
}

console.log('Environment Configuration Tests:');
console.log('----------------------------------');

// Critical environment variables
test('DATABASE_URL is set', () => {
  const url = process.env.DATABASE_URL;
  return url && url !== 'postgresql://user:password@host:5432/database?sslmode=require';
}, true);

test('ADMIN_API_KEY is set', () => {
  return process.env.ADMIN_API_KEY && process.env.ADMIN_API_KEY.length > 20;
}, true);

test('SESSION_SECRET is set', () => {
  return process.env.SESSION_SECRET && process.env.SESSION_SECRET.length > 20;
}, true);

test('JWT_SECRET is set', () => {
  return process.env.JWT_SECRET && process.env.JWT_SECRET.length > 20;
}, true);

test('OFFICIAL_WALLET_ADDRESS is set', () => {
  const wallet = process.env.OFFICIAL_WALLET_ADDRESS;
  return wallet && wallet !== 'your_public_solana_wallet_address_here' && wallet.length > 30;
}, true);

test('SOLANA_NETWORK is set', () => {
  const network = process.env.SOLANA_NETWORK;
  return network && (network === 'mainnet-beta' || network === 'devnet' || network === 'testnet');
}, false);

console.log('\nFile Structure Tests:');
console.log('----------------------');

test('package.json exists', () => fs.existsSync('package.json'));
test('server.js exists', () => fs.existsSync('server.js'));
test('prisma/schema.prisma exists', () => fs.existsSync('prisma/schema.prisma'));
test('node_modules directory exists', () => fs.existsSync('node_modules'));

console.log('\nDependency Tests:');
console.log('------------------');

test('Express is installed', () => {
  try {
    require.resolve('express');
    return true;
  } catch (e) {
    return false;
  }
});

test('Prisma Client is installed', () => {
  try {
    require.resolve('@prisma/client');
    return true;
  } catch (e) {
    return false;
  }
});

test('CORS is installed', () => {
  try {
    require.resolve('cors');
    return true;
  } catch (e) {
    return false;
  }
});

test('Rate Limit is installed', () => {
  try {
    require.resolve('express-rate-limit');
    return true;
  } catch (e) {
    return false;
  }
});

console.log('\nPrisma Tests:');
console.log('--------------');

test('Prisma client is generated', () => {
  return fs.existsSync('node_modules/.prisma/client');
});

console.log('\nDirectory Tests:');
console.log('----------------');

test('api/ directory exists', () => fs.existsSync('api'));
test('hybrid-pool/ directory exists', () => fs.existsSync('hybrid-pool'));
test('docs/ directory exists', () => fs.existsSync('docs'));
test('pages/ directory exists', () => fs.existsSync('pages'));

console.log('\nDatabase Connection Test:');
console.log('-------------------------');

const testDatabase = async () => {
  if (!process.env.DATABASE_URL || 
      process.env.DATABASE_URL === 'postgresql://user:password@host:5432/database?sslmode=require') {
    console.log('⚠️  Database URL not configured - skipping connection test');
    return false;
  }

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('✅ Database connection successful');
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    return false;
  }
};

// Run async tests
(async () => {
  const dbConnected = await testDatabase();

  console.log('\n================================');
  console.log('Summary:');
  console.log('================================\n');

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${totalTests - passedTests} ❌`);
  console.log(`Critical Failures: ${criticalFailures} 🔴\n`);

  if (criticalFailures > 0) {
    console.log('🔴 CRITICAL: Cannot start server - fix critical issues first!\n');
    console.log('Required actions:');
    console.log('1. Edit .env file and configure:');
    console.log('   - DATABASE_URL (PostgreSQL connection string)');
    console.log('   - OFFICIAL_WALLET_ADDRESS (Your public Solana wallet)');
    console.log('   - Ensure all secrets are properly generated\n');
    console.log('2. Run: npx prisma migrate deploy');
    console.log('3. Run this test again: node scripts/test-setup.js\n');
    process.exit(1);
  } else if (totalTests - passedTests > 0) {
    console.log('⚠️  Some non-critical tests failed. Server may start but check failures.\n');
    process.exit(0);
  } else {
    console.log('🎉 All tests passed! Ready to start server.\n');
    console.log('Next steps:');
    console.log('1. Start server: npm start');
    console.log('2. Test endpoints: curl http://localhost:3001/api/health');
    console.log('3. View frontend: open http://localhost:3001\n');
    process.exit(0);
  }
})();
