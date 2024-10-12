import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS and specify allowed origins
  app.enableCors({
    origin: 'http://localhost:3001', // Allow requests from React frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed HTTP methods
    credentials: true, // Allow sending credentials (cookies, authorization headers)
  });

  app.useGlobalPipes(new ValidationPipe());
  
  await app.listen(3000);
}
bootstrap();