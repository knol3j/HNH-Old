import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: configService.get('ALLOWED_ORIGINS', '*').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 3600,
  });

  // Global validation pipe with security settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: false, // Require explicit type conversion
      },
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     HashNHedge Orchestration API (NestJS + Prisma)      ║
║     Running on port ${port}                                  ║
║     Environment: ${configService.get('NODE_ENV', 'development')}                          ║
║                                                           ║
║   API Documentation: http://localhost:${port}/api/v1          ║
║   Health Check: http://localhost:${port}/api/v1/health       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
