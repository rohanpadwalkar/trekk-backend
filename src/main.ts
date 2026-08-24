import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { AppModule } from './app.module';
import { configureApp } from './create-app';

/**
 * Socket.IO adapter backed by Redis pub/sub, so real-time chat delivery
 * works correctly once there's more than one backend instance behind a
 * load balancer (a message published from instance A reaches a socket
 * connected to instance B).
 */
class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    private readonly app: any,
    private readonly redisUrl: string,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = new Redis(this.redisUrl);
    const subClient = pubClient.duplicate();
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = await configureApp(app);
  const logger = new Logger('Bootstrap');

  const redisUrl = config.get<string>('redisUrl')!;
  const redisIoAdapter = new RedisIoAdapter(app, redisUrl);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Trekk Together backend listening on :${port} (env: ${config.get('nodeEnv')})`);
}

bootstrap();
