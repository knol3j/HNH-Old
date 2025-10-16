import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { WorkersModule } from './modules/workers/workers.module';
import { MiningModule } from './modules/mining/mining.module';
import { ComputeModule } from './modules/compute/compute.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { CommunityModule } from './modules/community/community.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting - Multi-tier throttling
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 900000, // 15 minutes
        limit: 500,
      },
    ]),

    // Core modules
    DatabaseModule,
    AuthModule,
    WorkersModule,
    MiningModule,
    ComputeModule,
    VendorsModule,
    CommunityModule,
  ],
  controllers: [HealthController],
  providers: [
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
