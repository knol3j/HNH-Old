import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(private prisma: PrismaService) {}

  async registerMember(data: {
    email: string;
    username: string;
    fullName?: string;
    walletAddress?: string;
    interests?: string[];
    skills?: string[];
  }) {
    this.logger.log(`Registering community member: ${data.username}`);

    try {
      // Check if member already exists
      const existing = await this.prisma.communityMember.findFirst({
        where: {
          OR: [
            { email: data.email },
            { username: data.username },
          ],
        },
      });

      if (existing) {
        throw new BadRequestException('Email or username already exists');
      }

      const member = await this.prisma.communityMember.create({
        data: {
          email: data.email,
          username: data.username,
          fullName: data.fullName,
          walletAddress: data.walletAddress,
          interests: data.interests || [],
          skills: data.skills || [],
          contributionAreas: [],
          status: 'pending',
        },
      });

      this.logger.log(`Successfully registered member: ${member.username}`);
      return member;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to register member: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to register community member');
    }
  }

  async getMember(username: string) {
    const member = await this.prisma.communityMember.findUnique({
      where: { username },
      include: {
        contributions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        eventRegistrations: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member ${username} not found`);
    }

    return member;
  }

  async listMembers(filters?: { status?: string; limit?: number }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.communityMember.findMany({
      where,
      take: filters?.limit || 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        walletAddress: true,
        interests: true,
        skills: true,
        status: true,
        reputationScore: true,
        contributionsCount: true,
        createdAt: true,
      },
    });
  }

  async createEvent(data: {
    title: string;
    description?: string;
    eventType: string;
    startTime: Date;
    endTime?: Date;
    organizerId?: string;
  }) {
    this.logger.log(`Creating event: ${data.title}`);

    return this.prisma.communityEvent.create({
      data: {
        title: data.title,
        description: data.description,
        eventType: data.eventType,
        startTime: data.startTime,
        endTime: data.endTime,
        organizerId: data.organizerId,
        status: 'upcoming',
      },
    });
  }

  async listEvents(filters?: { status?: string; eventType?: string }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }

    return this.prisma.communityEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        organizer: {
          select: {
            username: true,
            fullName: true,
          },
        },
        registrations: {
          select: {
            id: true,
            registrationStatus: true,
          },
        },
      },
    });
  }

  async getCommunityStats() {
    const totalMembers = await this.prisma.communityMember.count();
    const activeMembers = await this.prisma.communityMember.count({
      where: { status: 'active' },
    });

    const totalContributions = await this.prisma.communityContribution.count();
    const approvedContributions = await this.prisma.communityContribution.count({
      where: { status: 'approved' },
    });

    const upcomingEvents = await this.prisma.communityEvent.count({
      where: { status: 'upcoming' },
    });

    return {
      members: {
        total: totalMembers,
        active: activeMembers,
      },
      contributions: {
        total: totalContributions,
        approved: approvedContributions,
      },
      events: {
        upcoming: upcomingEvents,
      },
    };
  }
}
