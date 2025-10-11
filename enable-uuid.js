const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enableExtensions() {
  console.log('Enabling PostgreSQL extensions...');

  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    console.log('✅ Extensions enabled successfully!');
  } catch (error) {
    console.error('❌ Error enabling extensions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

enableExtensions();
