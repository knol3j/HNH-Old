import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post('members')
  async registerMember(@Body() data: any) {
    return this.communityService.registerMember(data);
  }

  @Get('members')
  async listMembers(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.listMembers({
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('members/:username')
  async getMember(@Param('username') username: string) {
    return this.communityService.getMember(username);
  }

  @Post('events')
  async createEvent(@Body() data: any) {
    return this.communityService.createEvent(data);
  }

  @Get('events')
  async listEvents(
    @Query('status') status?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.communityService.listEvents({ status, eventType });
  }

  @Get('stats')
  async getStats() {
    return this.communityService.getCommunityStats();
  }
}
