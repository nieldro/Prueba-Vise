import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(
    helmet({
      // Swagger UI necesita scripts y estilos propios; el resto de cabeceras de helmet se mantiene.
      contentSecurityPolicy: false,
    }),
  );
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN').split(','),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('VISE Inventario API')
    .setDescription('Productos, movimientos y kardex')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`API en http://localhost:${port}/api  |  docs en /api/docs`);
}

void bootstrap();
