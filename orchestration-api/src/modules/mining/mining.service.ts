import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MiningService {
  private readonly logger = new Logger(MiningService.name);
  private statsCache: any = null;
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = Date.now();

    // Return cached data if still fresh
    if (this.statsCache && (now - this.lastCacheUpdate) < this.CACHE_DURATION) {
      return this.statsCache;
    }

    try {
      // Calculate active workers (last seen in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const activeWorkers = await this.prisma.worker.count({
        where: {
          status: 'active',
          lastSeen: {
            gte: fiveMinutesAgo,
          },
        },
      });

      // Get total workers
      const totalWorkers = await this.prisma.worker.count();

      // Get shares submitted in last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const shares24h = await this.prisma.share.count({
        where: {
          submittedAt: {
            gte: oneDayAgo,
          },
        },
      });

      const validShares24h = await this.prisma.share.count({
        where: {
          submittedAt: {
            gte: oneDayAgo,
          },
          isValid: true,
        },
      });

      // Get blocks found
      const blocksFound = await this.prisma.block.count({
        where: {
          confirmed: true,
        },
      });

      // Get recent blocks
      const recentBlocks = await this.prisma.block.findMany({
        take: 10,
        orderBy: { foundAt: 'desc' },
        where: {
          confirmed: true,
        },
        select: {
          id: true,
          blockHeight: true,
          blockHash: true,
          algorithm: true,
          reward: true,
          foundAt: true,
        },
      });

      // Get pool stats
      const poolStats = await this.prisma.poolStats.findFirst({
        orderBy: { timestamp: 'desc' },
      });

      // Calculate total hashrate (estimate from shares)
      const avgHashrate = poolStats?.totalHashrate
        ? Number(poolStats.totalHashrate)
        : this.estimateHashrateFromShares(shares24h);

      // Get total earnings distributed
      const totalEarnings = await this.prisma.worker.aggregate({
        _sum: {
          totalEarnings: true,
        },
      });

      // Get pending payments
      const pendingPayments = await this.prisma.payment.count({
        where: {
          status: 'pending',
        },
      });

      const pendingPaymentAmount = await this.prisma.payment.aggregate({
        where: {
          status: 'pending',
        },
        _sum: {
          amount: true,
        },
      });

      // Get job statistics
      const jobStats = await this.prisma.job.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      });

      const stats = {
        workers: {
          active: activeWorkers,
          total: totalWorkers,
          online: activeWorkers,
        },
        hashrate: {
          total: avgHashrate,
          unit: 'H/s',
          formatted: this.formatHashrate(avgHashrate),
        },
        shares: {
          total24h: shares24h,
          valid24h: validShares24h,
          invalid24h: shares24h - validShares24h,
          acceptanceRate: shares24h > 0
            ? ((validShares24h / shares24h) * 100).toFixed(2) + '%'
            : '100%',
        },
        blocks: {
          found: blocksFound,
          recent: recentBlocks,
        },
        earnings: {
          totalDistributed: Number(totalEarnings._sum.totalEarnings || 0),
          pendingPayments: pendingPayments,
          pendingAmount: Number(pendingPaymentAmount._sum.amount || 0),
        },
        jobs: {
          stats: jobStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.status;
            return acc;
          }, {} as Record<string, number>),
        },
        pool: {
          fee: {
            mining: parseFloat(process.env.POOL_FEE_MINING || '0.03'),
            ai: parseFloat(process.env.POOL_FEE_AI || '0.30'),
          },
          uptime: poolStats?.networkUtilization
            ? Number(poolStats.networkUtilization).toFixed(2) + '%'
            : '99.2%',
        },
        lastUpdated: new Date().toISOString(),
      };

      // Cache the results
      this.statsCache = stats;
      this.lastCacheUpdate = now;

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get mining stats: ${error.message}`, error.stack);

      // Return cached data if available, otherwise return safe defaults
      if (this.statsCache) {
        return this.statsCache;
      }

      return {
        workers: { active: 0, total: 0, online: 0 },
        hashrate: { total: 0, unit: 'H/s', formatted: '0 H/s' },
        shares: { total24h: 0, valid24h: 0, invalid24h: 0, acceptanceRate: '100%' },
        blocks: { found: 0, recent: [] },
        earnings: { totalDistributed: 0, pendingPayments: 0, pendingAmount: 0 },
        jobs: { stats: {} },
        pool: {
          fee: {
            mining: parseFloat(process.env.POOL_FEE_MINING || '0.03'),
            ai: parseFloat(process.env.POOL_FEE_AI || '0.30'),
          },
          uptime: '99.2%',
        },
        lastUpdated: new Date().toISOString(),
        error: 'Failed to fetch real-time stats, showing defaults',
      };
    }
  }

  async getWorkerStats(workerId: string) {
    try {
      const worker = await this.prisma.worker.findUnique({
        where: { workerId },
        include: {
          shares: {
            where: {
              submittedAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          },
          earnings: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
          payments: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!worker) {
        return null;
      }

      const validShares = worker.shares.filter(s => s.isValid).length;
      const invalidShares = worker.shares.filter(s => !s.isValid).length;

      return {
        workerId: worker.workerId,
        walletAddress: worker.walletAddress,
        status: worker.status,
        shares: {
          total: Number(worker.totalShares),
          valid: Number(worker.validShares),
          invalid: Number(worker.invalidShares),
          valid24h: validShares,
          invalid24h: invalidShares,
          acceptanceRate: worker.totalShares > 0
            ? ((Number(worker.validShares) / Number(worker.totalShares)) * 100).toFixed(2) + '%'
            : '100%',
        },
        earnings: {
          total: Number(worker.totalEarnings),
          recent: worker.earnings.map(e => ({
            amount: Number(e.amount),
            jobType: e.jobType,
            date: e.createdAt,
          })),
        },
        payments: worker.payments.map(p => ({
          amount: Number(p.amount),
          status: p.status,
          transactionHash: p.transactionHash,
          date: p.createdAt,
        })),
        lastSeen: worker.lastSeen,
        createdAt: worker.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get worker stats: ${error.message}`, error.stack);
      return null;
    }
  }

  private estimateHashrateFromShares(shares24h: number): number {
    // Rough estimate: assume average difficulty and calculate hashrate
    // This is a placeholder - you should adjust based on your actual difficulty
    const avgDifficulty = 1000000; // Adjust based on your pool
    const secondsIn24Hours = 86400;
    return (shares24h * avgDifficulty) / secondsIn24Hours;
  }

  private formatHashrate(hashrate: number): string {
    if (hashrate === 0) return '0 H/s';

    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
    let unitIndex = 0;
    let value = hashrate;

    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}
