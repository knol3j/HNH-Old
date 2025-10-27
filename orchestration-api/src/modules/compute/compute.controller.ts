import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ComputeService } from './compute.service';

@Controller('compute')
export class ComputeController {
  constructor(private readonly computeService: ComputeService) {}

  @Post('jobs')
  async createJob(@Body() data: any) {
    return this.computeService.createJob(data);
  }

  @Get('jobs')
  async listJobs(
    @Query('status') status?: string,
    @Query('jobType') jobType?: string,
    @Query('limit') limit?: string,
  ) {
    return this.computeService.listJobs({
      status,
      jobType,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('jobs/:jobId')
  async getJob(@Param('jobId') jobId: string) {
    return this.computeService.getJob(jobId);
  }

  @Post('jobs/:jobId/assign')
  async assignJob(
    @Param('jobId') jobId: string,
    @Body('workerId') workerId: string,
  ) {
    return this.computeService.assignJob(jobId, workerId);
  }

  @Post('jobs/:jobId/complete')
  async completeJob(@Param('jobId') jobId: string, @Body() result: any) {
    return this.computeService.completeJob(jobId, result);
  }

  @Get('stats')
  async getStats() {
    return this.computeService.getComputeStats();
  }
}
