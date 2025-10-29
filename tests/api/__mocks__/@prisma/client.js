// Mock Prisma Client for testing without database connection
class PrismaClient {
  constructor() {
    this.worker = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    this.job = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    };
    this.share = {
      create: jest.fn(),
      findMany: jest.fn()
    };
    this.$disconnect = jest.fn().mockResolvedValue(undefined);
    this.$connect = jest.fn().mockResolvedValue(undefined);
  }
}

const Prisma = {
  PrismaClient
};

module.exports = { PrismaClient, Prisma };
