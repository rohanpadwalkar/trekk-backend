import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

/**
 * @Global so any module can inject RedisService without re-importing this
 * module everywhere — Redis here is pure infrastructure (cache + rate-limit
 * store), not a domain concept.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: RedisService,
      useFactory: (config: ConfigService) =>
        new RedisService({
          redisUrl: config.get<string>('redisUrl')!,
          upstashRestUrl: config.get<string>('upstash.restUrl'),
          upstashRestToken: config.get<string>('upstash.restToken'),
        }),
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
