import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { VendorsService } from './vendors.service';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  async registerVendor(@Body() data: any) {
    return this.vendorsService.registerVendor(data);
  }

  @Get()
  async listVendors(
    @Query('status') status?: string,
    @Query('businessType') businessType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vendorsService.listVendors({
      status,
      businessType,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('stats')
  async getStats() {
    return this.vendorsService.getVendorStats();
  }

  @Get(':vendorId')
  async getVendor(@Param('vendorId') vendorId: string) {
    return this.vendorsService.getVendor(vendorId);
  }

  @Put(':vendorId/approve')
  async approveVendor(
    @Param('vendorId') vendorId: string,
    @Body('approvedBy') approvedBy: string,
    @Body('notes') notes?: string,
  ) {
    return this.vendorsService.approveVendor(vendorId, approvedBy, notes);
  }

  @Post(':vendorId/offerings')
  async createOffering(
    @Param('vendorId') vendorId: string,
    @Body() data: any,
  ) {
    return this.vendorsService.createOffering(vendorId, data);
  }

  @Get('offerings/list')
  async listOfferings(
    @Query('vendorId') vendorId?: string,
    @Query('offeringType') offeringType?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.vendorsService.listOfferings({
      vendorId,
      offeringType,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }
}
