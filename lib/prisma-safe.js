/**
 * Safe Prisma Client Wrapper
 * Provides graceful degradation when Prisma client is not properly initialized
 * This allows the application to start even if the database is unavailable
 */

let prisma;
let prismaAvailable = false;

try {
  const { PrismaClient } = require('@prisma/client');

  // Check if PrismaClient is properly initialized (not a stub)
  const testClient = new PrismaClient();
  if (testClient.$connect) {
    prismaAvailable = true;

    if (process.env.NODE_ENV === 'production') {
      prisma = new PrismaClient();
    } else {
      if (!global.prisma) {
        global.prisma = new PrismaClient({
          log: ['error', 'warn'],
        });
      }
      prisma = global.prisma;
    }

    console.log('✅ Prisma client initialized successfully');
  }
} catch (error) {
  console.warn('⚠️  Prisma client not available:', error.message);
  console.warn('⚠️  Database operations will be disabled. Run "npx prisma generate" to fix this.');

  // Create a mock Prisma client that returns helpful error messages
  prisma = new Proxy({}, {
    get: (target, prop) => {
      if (prop === '$disconnect' || prop === '$connect') {
        return async () => {
          console.warn('Database not available');
        };
      }
      return new Proxy({}, {
        get: () => {
          return () => {
            throw new Error('Database not available. Please run "npx prisma generate" and ensure DATABASE_URL is set.');
          };
        }
      });
    }
  });
}

module.exports = prisma;
module.exports.isAvailable = prismaAvailable;
