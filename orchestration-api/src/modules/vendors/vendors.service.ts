import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(private prisma: PrismaService) {}

  async registerVendor(data: {
    companyName: string;
    contactEmail: string;
    contactPersonName: string;
    businessType?: string;
    productsServices?: string;
    integrationInterest?: string[];
  }) {
    this.logger.log(`Registering vendor: ${data.companyName}`);

    try {
      // Check if vendor already exists
      const existing = await this.prisma.vendor.findFirst({
        where: {
          OR: [
            { companyName: data.companyName },
            { contactEmail: data.contactEmail },
          ],
        },
      });

      if (existing) {
        throw new BadRequestException('Company name or contact email already exists');
      }

      const vendor = await this.prisma.vendor.create({
        data: {
          companyName: data.companyName,
          contactEmail: data.contactEmail,
          contactPersonName: data.contactPersonName,
          businessType: data.businessType,
          productsServices: data.productsServices,
          integrationInterest: data.integrationInterest || [],
          status: 'pending',
          termsAccepted: false,
        },
      });

      this.logger.log(`Successfully registered vendor: ${vendor.companyName}`);

      // TODO: Send welcome email to vendor
      // await this.emailService.sendVendorWelcomeEmail(vendor);

      return vendor;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to register vendor: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to register vendor');
    }
  }

  async getVendor(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        offerings: {
          where: { isActive: true },
        },
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found`);
    }

    return vendor;
  }

  async listVendors(filters?: { status?: string; businessType?: string; limit?: number }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.businessType) {
      where.businessType = filters.businessType;
    }

    return this.prisma.vendor.findMany({
      where,
      take: filters?.limit || 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyName: true,
        contactEmail: true,
        businessType: true,
        status: true,
        rating: true,
        totalTransactions: true,
        totalVolume: true,
        createdAt: true,
      },
    });
  }

  async approveVendor(vendorId: string, approvedBy: string, notes?: string) {
    this.logger.log(`Approving vendor: ${vendorId}`);

    try {
      const vendor = await this.prisma.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'approved',
          approvedBy,
          approvedAt: new Date(),
          approvalNotes: notes,
        },
      });

      // TODO: Send approval email
      // await this.emailService.sendVendorApprovalEmail(vendor);

      return vendor;
    } catch (error) {
      this.logger.error(`Failed to approve vendor: ${error.message}`, error.stack);
      throw error;
    }
  }

  async createOffering(vendorId: string, data: {
    offeringType: string;
    name: string;
    description?: string;
    category?: string;
    pricingModel?: string;
    basePrice?: number;
  }) {
    this.logger.log(`Creating offering for vendor: ${vendorId}`);

    // Verify vendor exists and is approved
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor ${vendorId} not found`);
    }

    if (vendor.status !== 'approved') {
      throw new BadRequestException('Vendor must be approved to create offerings');
    }

    return this.prisma.vendorOffering.create({
      data: {
        vendorId,
        offeringType: data.offeringType,
        name: data.name,
        description: data.description,
        category: data.category,
        pricingModel: data.pricingModel,
        basePrice: data.basePrice,
        isActive: true,
      },
    });
  }

  async listOfferings(filters?: { vendorId?: string; offeringType?: string; isActive?: boolean }) {
    const where: any = {};

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.offeringType) {
      where.offeringType = filters.offeringType;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.vendorOffering.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            rating: true,
          },
        },
      },
    });
  }

  async getVendorStats() {
    const totalVendors = await this.prisma.vendor.count();
    const approvedVendors = await this.prisma.vendor.count({
      where: { status: 'approved' },
    });
    const pendingVendors = await this.prisma.vendor.count({
      where: { status: 'pending' },
    });

    const totalOfferings = await this.prisma.vendorOffering.count();
    const activeOfferings = await this.prisma.vendorOffering.count({
      where: { isActive: true },
    });

    return {
      vendors: {
        total: totalVendors,
        approved: approvedVendors,
        pending: pendingVendors,
      },
      offerings: {
        total: totalOfferings,
        active: activeOfferings,
      },
    };
  }
}
