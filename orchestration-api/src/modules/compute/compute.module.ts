import { Module } from '@nestjs/common';
import { ComputeController } from './compute.controller';
import { ComputeService } from './compute.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ComputeController],
  providers: [ComputeService],
  exports: [ComputeService],
})
export class ComputeModule {}
