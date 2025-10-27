import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

interface WorkerRegistrationData {
  walletAddress: string;
  hardwareInfo?: {
    gpuModel?: string;
    gpuCount?: number;
    cpuModel?: string;
    cpuCores?: number;
    ramGb?: number;
    osType?: string;
    osVersion?: string;
  };
}

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(private prisma: PrismaService) {}

  async register(data: WorkerRegistrationData) {
    this.logger.log(`Registering new worker for wallet: ${data.walletAddress}`);

    // Validate wallet address
    if (!data.walletAddress || typeof data.walletAddress !== 'string') {
      throw new BadRequestException('Valid wallet address is required');
    }

    // Validate wallet address format (basic Solana address validation)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(data.walletAddress)) {
      throw new BadRequestException('Invalid Solana wallet address format');
    }

    try {
      // Generate unique worker ID
      const workerId = this.generateWorkerId(data.walletAddress);

      // Check if worker already exists
      const existingWorker = await this.prisma.worker.findUnique({
        where: { workerId },
      });

      if (existingWorker) {
        // Update existing worker instead of creating duplicate
        this.logger.log(`Worker ${workerId} already exists, updating last seen`);
        return await this.prisma.worker.update({
          where: { workerId },
          data: {
            lastSeen: new Date(),
            hardwareInfo: data.hardwareInfo as Prisma.JsonValue || existingWorker.hardwareInfo,
            status: 'active',
          },
        });
      }

      // Create new worker
      const worker = await this.prisma.worker.create({
        data: {
          workerId,
          walletAddress: data.walletAddress,
          hardwareInfo: data.hardwareInfo as Prisma.JsonValue || {},
          status: 'active',
          lastSeen: new Date(),
        },
      });

      this.logger.log(`Successfully registered worker ${workerId}`);
      return worker;

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }

      this.logger.error(`Failed to register worker: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to register worker. Please try again.');
    }
  }

  async findOne(workerId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
      include: {
        shares: {
          take: 10,
          orderBy: { submittedAt: 'desc' },
        },
        earnings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!worker) {
      return null;
    }

    return worker;
  }

  async findAll() {
    return this.prisma.worker.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        workerId: true,
        walletAddress: true,
        status: true,
        createdAt: true,
        lastSeen: true,
        totalShares: true,
        validShares: true,
        invalidShares: true,
        totalEarnings: true,
        hardwareInfo: true,
      },
    });
  }

  async updateHeartbeat(workerId: string) {
    try {
      return await this.prisma.worker.update({
        where: { workerId },
        data: {
          lastSeen: new Date(),
          status: 'active',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update heartbeat for worker ${workerId}: ${error.message}`);
      throw new BadRequestException('Failed to update worker heartbeat');
    }
  }

  async getStats(workerId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { workerId },
      include: {
        shares: {
          where: {
            submittedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
        earnings: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
      },
    });

    if (!worker) {
      return null;
    }

    const validShares24h = worker.shares.filter(s => s.isValid).length;
    const invalidShares24h = worker.shares.filter(s => !s.isValid).length;
    const earnings24h = worker.earnings.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    return {
      workerId: worker.workerId,
      walletAddress: worker.walletAddress,
      status: worker.status,
      totalShares: Number(worker.totalShares),
      validShares: Number(worker.validShares),
      invalidShares: Number(worker.invalidShares),
      totalEarnings: Number(worker.totalEarnings),
      validShares24h,
      invalidShares24h,
      earnings24h,
      acceptanceRate: worker.totalShares > 0
        ? (Number(worker.validShares) / Number(worker.totalShares) * 100).toFixed(2) + '%'
        : '0%',
      lastSeen: worker.lastSeen,
      createdAt: worker.createdAt,
    };
  }

  private generateWorkerId(walletAddress: string): string {
    // Generate deterministic worker ID from wallet address
    const hash = crypto.createHash('sha256').update(walletAddress).digest('hex');
    return `worker_${hash.substring(0, 16)}`;
  }
}
