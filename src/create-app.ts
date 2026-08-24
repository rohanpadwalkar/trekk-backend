import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

/**
 * Shared app configuration used by both entrypoints:
 * - main.ts (local dev / Docker / Render — listens on a port, sets up the
 *   Socket.IO Redis adapter)
 * - api/index.ts (Vercel — request/response handled by the platform, no
 *   .listen() or WebSocket adapter since serverless functions can't hold a
 *   persistent socket connection)
 */
export async function configureApp(app: INestApplication): Promise<ConfigService> {
  const config = app.get(ConfigService);

  app.use(helmet());

  const corsOrigin = config.get<string[]>('corsOrigin') ?? [];
  app.enableCors({
    origin: corsOrigin.length > 0 ? corsOrigin : true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger/OpenAPI docs. Deliberately mounted OUTSIDE the /api/v1 prefix
  // (setGlobalPrefix only applies to controller routes, not this), at the
  // path requested: /api/docs. SwaggerModule.setup() adds plain Express
  // routes to the same http.Server the rest of the app already uses.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trekk Together API')
    .setDescription(
      'Trekk Together backend. Auth: paste an access token from /auth/login or /auth/signup into the Authorize button below (Bearer scheme). Endpoints marked @Public() in source need no token.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  return config;
}
