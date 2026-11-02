import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { originCheck } from './common/origin-check';

export const API_PREFIX = 'api/v1';

// Shared by main.ts and api/index.ts (Vercel): global setup goes here, never in one entrypoint
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix(API_PREFIX);
  // Defaults incl. CSP are safe for a JSON API: browsers come via the frontend's /api rewrite.
  // Swagger UI is the one HTML page, and its inline scripts need the CSP relaxed for /docs only
  const apiHelmet = helmet();
  const docsHelmet = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    req.path.startsWith(`/${API_PREFIX}/docs`) ? docsHelmet(req, res, next) : apiHelmet(req, res, next),
  );
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  app.enableCors({ origin: frontendUrl, credentials: true });
  // CSRF: mutations only from our frontend (Swagger "Try it out" works through the frontend's /api rewrite)
  app.use(originCheck(new URL(frontendUrl).origin));
  // transform: DTO @Transform (trim, lower-case email) reaches the handler
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cookieParser());

  const openApi = new DocumentBuilder().setTitle('Temerelle API').setVersion('1').addCookieAuth('access_token').build();
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, () => SwaggerModule.createDocument(app, openApi));
}
