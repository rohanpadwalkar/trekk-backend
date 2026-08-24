import type { IncomingMessage, ServerResponse } from 'http';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/create-app';

/**
 * Vercel serverless entrypoint. Bootstraps Nest once per cold start and
 * reuses it across warm invocations of this function.
 *
 * No .listen() and no Socket.IO Redis adapter here (unlike src/main.ts) —
 * a serverless function can't hold the persistent connection real-time
 * chat needs. REST endpoints all work; WebSocket messaging does not run
 * on this deployment target.
 */
const server = express();
let bootstrapped: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  await configureApp(app);
  await app.init();
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!bootstrapped) bootstrapped = bootstrap();
  await bootstrapped;
  server(req, res);
}
