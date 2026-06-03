import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  // CORS: the storefront (localhost:3000) and Playwright (file://) both hit
  // this from another origin. Permissive in dev/CI; lock down by origin in
  // a real prod deploy.
  app.enableCors({
    origin: true,
    credentials: true,
    // Surface the X-Cache observability header to the browser so the
    // admin/metrics page (and any future client) can read it via
    // `response.headers.get('x-cache')`.
    exposedHeaders: ['X-Cache'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('QA Automation Platform — SUT API')
    .setDescription('Lean e-commerce API used as the system under test.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  console.log(`[api] listening on http://localhost:${port}`);
  console.log(`[api] swagger at http://localhost:${port}/docs`);
}

void bootstrap();
