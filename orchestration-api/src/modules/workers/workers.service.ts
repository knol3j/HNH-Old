import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkersService {
  constructor(private prisma: PrismaService) {}

  async register(data: any) {
    // TODO: Implement worker registration logic
    return { message: 'Worker registration endpoint - to be implemented' };
  }

  async findOne(workerId: string) {
    return this.prisma.worker.findUnique({
      where: { workerId },
    });
  }

  async findAll() {
    return this.prisma.worker.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
  }
}
