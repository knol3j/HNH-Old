import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/enums/user-role.enum';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post('register')
  @Roles(UserRole.MINER, UserRole.ADMIN)
  async register(@Body() registerDto: any) {
    return this.workersService.register(registerDto);
  }

  @Get(':workerId')
  async getWorker(@Param('workerId') workerId: string) {
    return this.workersService.findOne(workerId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async listWorkers() {
    return this.workersService.findAll();
  }
}
