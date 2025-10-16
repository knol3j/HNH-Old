import { Controller, Get } from '@nestjs/common';
import { MiningService } from './mining.service';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('mining')
export class MiningController {
  constructor(private readonly miningService: MiningService) {}

  @Public()
  @Get('stats')
  async getStats() {
    return this.miningService.getStats();
  }
}
