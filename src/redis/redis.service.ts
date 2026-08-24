import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import IoRedis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

/**
 * Minimal cache surface both backends implement, so the rest of the app
 * (RedisService, RedisThrottlerStorage) doesn't need to know which one is
 * live. Every value in/out is a raw string — this service does its own
 * JSON encode/decode on top, same as before.
 */
export interface CacheBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
  keysByPrefix(prefix: string): Promise<string[]>;
  // Throttler-specific primitives (kept here so there's exactly one place
  // that knows how to talk to either backend).
  incr(key: string): Promise<number>;
  pttl(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<void>;
  psetOne(key: string, ttlMs: number): Promise<void>;
  quit(): Promise<void>;
}

class IoredisBackend implements CacheBackend {
  readonly client: IoRedis;

  constructor(redisUrl: string) {
    this.client = new IoRedis(redisUrl, { maxRetriesPerRequest: 3 });
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(...keys: string[]) {
    if (keys.length === 0) return;
    await this.client.del(...keys);
  }

  async keysByPrefix(prefix: string) {
    const stream = this.client.scanStream({ match: `${prefix}*`, count: 100 });
    const keys: string[] = [];
    for await (const batch of stream) {
      keys.push(...(batch as string[]));
    }
    return keys;
  }

  async incr(key: string) {
    return this.client.incr(key);
  }

  async pttl(key: string) {
    return this.client.pttl(key);
  }

  async pexpire(key: string, ms: number) {
    await this.client.pexpire(key, ms);
  }

  async psetOne(key: string, ttlMs: number) {
    await this.client.set(key, '1', 'PX', ttlMs);
  }

  async quit() {
    await this.client.quit();
  }
}

/**
 * REST-based backend (Upstash) — no TCP connection to hold open, so it
 * can't be exhausted by a burst of concurrently-scaled Vercel Function
 * instances the way a pooled TCP client can. Used in production; see
 * docs/10-backend-design.md "Deploying: Vercel" for why.
 */
class UpstashBackend implements CacheBackend {
  private readonly client: UpstashRedis;

  constructor(url: string, token: string) {
    this.client = new UpstashRedis({ url, token });
  }

  async get(key: string) {
    const raw = await this.client.get<unknown>(key);
    if (raw === null || raw === undefined) return null;
    // @upstash/redis auto-parses JSON-looking strings on read; normalize
    // back to a raw string either way so callers always get a string here.
    return typeof raw === 'string' ? raw : JSON.stringify(raw);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, { ex: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async del(...keys: string[]) {
    if (keys.length === 0) return;
    await this.client.del(...keys);
  }

  async keysByPrefix(prefix: string) {
    const keys: string[] = [];
    let cursor = 0;
    do {
      const [nextCursor, batch] = await this.client.scan(cursor, {
        match: `${prefix}*`,
        count: 100,
      });
      keys.push(...batch);
      cursor = Number(nextCursor);
    } while (cursor !== 0);
    return keys;
  }

  async incr(key: string) {
    return this.client.incr(key);
  }

  async pttl(key: string) {
    return this.client.pttl(key);
  }

  async pexpire(key: string, ms: number) {
    await this.client.pexpire(key, ms);
  }

  async psetOne(key: string, ttlMs: number) {
    await this.client.set(key, '1', { px: ttlMs });
  }

  async quit() {
    // Stateless HTTP client — nothing to close.
  }
}

export function createCacheBackend(opts: {
  redisUrl: string;
  upstashRestUrl?: string;
  upstashRestToken?: string;
}): CacheBackend {
  if (opts.upstashRestUrl && opts.upstashRestToken) {
    return new UpstashBackend(opts.upstashRestUrl, opts.upstashRestToken);
  }
  return new IoredisBackend(opts.redisUrl);
}

/**
 * Cache used for:
 *  - Discover-feed trek-list caching (60s TTL, invalidated on writes)
 *  - Socket.IO adapter is wired separately in main.ts with its own raw
 *    ioredis pub/sub client, since it needs TCP regardless of backend here.
 *
 * Backed by Upstash's REST API when UPSTASH_REDIS_REST_URL/TOKEN are set
 * (production/Vercel), or plain ioredis against REDIS_URL otherwise (local
 * docker-compose Redis, which has no REST endpoint). See createCacheBackend.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly backend: CacheBackend;

  constructor(opts: { redisUrl: string; upstashRestUrl?: string; upstashRestToken?: string }) {
    this.backend = createCacheBackend(opts);
    this.logger.log(
      opts.upstashRestUrl && opts.upstashRestToken
        ? 'RedisService using Upstash REST backend'
        : 'RedisService using ioredis TCP backend',
    );
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.backend.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const raw = JSON.stringify(value);
    await this.backend.set(key, raw, ttlSeconds);
  }

  async del(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    await this.backend.del(...keys);
  }

  /** Deletes every key matching a prefix — used to invalidate all cached trek-list variants at once. */
  async delByPrefix(prefix: string): Promise<void> {
    const keys = await this.backend.keysByPrefix(prefix);
    if (keys.length > 0) {
      await this.backend.del(...keys);
    }
  }

  async onModuleDestroy() {
    await this.backend.quit();
  }
}
