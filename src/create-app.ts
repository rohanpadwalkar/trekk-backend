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
  //
  // customCssUrl/customJs load the Swagger UI's JS/CSS from a CDN instead
  // of the local swagger-ui-dist package files. This deployment's Vercel
  // Function (api/index.ts) is built by Vercel's generic Node.js bundler,
  // which only traces files actually `require()`d/`import`ed from JS/TS —
  // swagger-ui-express serves its UI assets by reading them off disk at
  // runtime (fs.readFileSync against swagger-ui-dist's package folder),
  // which that bundler doesn't pick up, so those files 404 in production
  // and the page fails with "ReferenceError: SwaggerUIBundle is not
  // defined" (confirmed via browser console on the deployed app). Loading
  // the same assets from a CDN sidesteps needing them in the deployed
  // bundle at all. Version pinned to match the installed @nestjs/swagger
  // major (8.x ships against swagger-ui-dist 5.x).
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
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { persistAuthorization: true },
    customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css',
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
  });

  return config;
}
