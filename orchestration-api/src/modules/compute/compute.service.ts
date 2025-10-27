import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ComputeService {
  private readonly logger = new Logger(ComputeService.name);

  constructor(private prisma: PrismaService) {}

  async createJob(data: {
    jobType: string;
    algorithm?: string;
    difficulty?: bigint;
    reward?: number;
    metadata?: any;
  }) {
    this.logger.log(`Creating new ${data.jobType} job`);

    try {
      const job = await this.prisma.job.create({
        data: {
          jobId: this.generateJobId(),
          jobType: data.jobType,
          algorithm: data.algorithm,
          difficulty: data.difficulty,
          reward: data.reward ? new Prisma.Decimal(data.reward) : null,
          status: 'pending',
          metadata: data.metadata as Prisma.JsonValue || {},
        },
      });

      this.logger.log(`Created job ${job.jobId}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to create job: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getJob(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { jobId },
      include: {
        worker: {
          select: {
            workerId: true,
            walletAddress: true,
            status: true,
          },
        },
        shares: {
          take: 10,
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return job;
  }

  async listJobs(filters?: { status?: string; jobType?: string; limit?: number }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.jobType) {
      where.jobType = filters.jobType;
    }

    return this.prisma.job.findMany({
      where,
      take: filters?.limit || 50,
      orderBy: { createdAt: 'desc' },
      include: {
        worker: {
          select: {
            workerId: true,
            walletAddress: true,
          },
        },
      },
    });
  }

  async assignJob(jobId: string, workerId: string) {
    this.logger.log(`Assigning job ${jobId} to worker ${workerId}`);

    try {
      // Find worker
      const worker = await this.prisma.worker.findUnique({
        where: { workerId },
      });

      if (!worker) {
        throw new NotFoundException(`Worker ${workerId} not found`);
      }

      // Update job
      return await this.prisma.job.update({
        where: { jobId },
        data: {
          assignedWorker: worker.id,
          status: 'assigned',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to assign job: ${error.message}`, error.stack);
      throw error;
    }
  }

  async completeJob(jobId: string, result: any) {
    this.logger.log(`Completing job ${jobId}`);

    return this.prisma.job.update({
      where: { jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        metadata: result as Prisma.JsonValue,
      },
    });
  }

  async getComputeStats() {
    const totalJobs = await this.prisma.job.count();
    const pendingJobs = await this.prisma.job.count({ where: { status: 'pending' } });
    const completedJobs = await this.prisma.job.count({ where: { status: 'completed' } });

    const jobsByType = await this.prisma.job.groupBy({
      by: ['jobType'],
      _count: { jobType: true },
    });

    return {
      total: totalJobs,
      pending: pendingJobs,
      completed: completedJobs,
      byType: jobsByType.reduce((acc, item) => {
        acc[item.jobType] = item._count.jobType;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}
