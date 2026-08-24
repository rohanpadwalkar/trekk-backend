import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { CacheBackend, createCacheBackend } from './redis.service';

/**
 * Rate-limit store for @nestjs/throttler. This is what makes limits
 * (especially on /auth/login and /auth/signup — brute-force targets) hold
 * up across multiple concurrently-scaled instances instead of resetting
 * per-process, which the default in-memory storage would do.
 *
 * Backed by the same Upstash-REST-or-ioredis choice as RedisService (see
 * redis.service.ts) — hit on nearly every request, so REST matters here
 * specifically to avoid exhausting a serverless host's TCP connection cap.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly backend: CacheBackend;

  constructor(opts: { redisUrl: string; upstashRestUrl?: string; upstashRestToken?: string }) {
    this.backend = createCacheBackend(opts);
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle-block:${throttlerName}:${key}`;

    const blockedTtlMs = await this.backend.pttl(blockKey);
    if (blockedTtlMs > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: Math.ceil(blockedTtlMs / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockedTtlMs / 1000),
      };
    }

    const totalHits = await this.backend.incr(hitKey);
    let ttlMs = await this.backend.pttl(hitKey);
    if (ttlMs <= 0) {
      await this.backend.pexpire(hitKey, ttl * 1000);
      ttlMs = ttl * 1000;
    }

    const isBlocked = totalHits > limit;
    if (isBlocked && blockDuration > 0) {
      await this.backend.psetOne(blockKey, blockDuration * 1000);
    }

    return {
      totalHits,
      timeToExpire: Math.ceil(ttlMs / 1000),
      isBlocked,
      timeToBlockExpire: isBlocked ? blockDuration : 0,
    };
  }
}
