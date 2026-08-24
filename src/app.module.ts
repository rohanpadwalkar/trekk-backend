import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import configuration from './config/configuration';
import { RedisModule } from './redis/redis.module';
import { RedisThrottlerStorage } from './redis/throttler-storage.redis';
import { StorageModule } from './storage/storage.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UploadsModule } from './uploads/uploads.module';
import { TreksModule } from './treks/treks.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FollowsModule } from './follows/follows.module';
import { PostsModule } from './posts/posts.module';
import { JoinRequestsModule } from './join-requests/join-requests.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get<string>('mongoUri') }),
    }),

    // Distributed rate limiting: backed by Redis (see RedisThrottlerStorage)
    // rather than the default in-memory store, so limits on brute-force
    // targets like /auth/login hold up across multiple backend instances.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl')! * 1000,
            limit: config.get<number>('throttle.limit')!,
          },
        ],
        storage: new RedisThrottlerStorage({
          redisUrl: config.get<string>('redisUrl')!,
          upstashRestUrl: config.get<string>('upstash.restUrl'),
          upstashRestToken: config.get<string>('upstash.restToken'),
        }),
      }),
    }),

    RedisModule,
    StorageModule,

    HealthModule,
    AuthModule,
    UsersModule,
    UploadsModule,
    TreksModule,
    BookingsModule,
    ReviewsModule,
    FollowsModule,
    PostsModule,
    JoinRequestsModule,
    MessagingModule,
    NotificationsModule,
  ],
  providers: [
    // Every route requires a valid access token unless marked @Public() —
    // applied globally so no controller can forget to guard a route.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Role checks (e.g. @Roles('vendor')) run after auth. Resource-level
    // ownership checks still live in each service, not here.
    { provide: APP_GUARD, useClass: RolesGuard },
    // App-wide rate limiting; auth endpoints additionally set a tighter
    // @Throttle() override (see auth.controller.ts).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
