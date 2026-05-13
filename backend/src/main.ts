import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded, raw } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Enable raw body for Stripe webhook verification
    rawBody: true,
  });

  // Raw body for Stripe webhooks (must be before json middleware)
  app.use('/webhooks/stripe', raw({ type: 'application/json' }));

  // Request size limits for audio uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Enable CORS
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3001';
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.listen(3000);
  console.log(`Server running on port 3000, CORS origin: ${corsOrigin}`);
}
bootstrap();
