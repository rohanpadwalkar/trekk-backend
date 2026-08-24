export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: (process.env.CORS_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean),

  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/trekk_together',

  // TCP Redis connection — used ONLY by the Socket.IO adapter in main.ts,
  // which needs a real duplex pub/sub client (@socket.io/redis-adapter
  // can't work over a REST API). Point this at the same Upstash database's
  // standard "rediss://" TCP endpoint (Upstash exposes both a REST URL and
  // a TCP one for the same database — see .env.example).
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

  // REST-based Redis — used for the cache (RedisService) and the rate-limit
  // store (RedisThrottlerStorage), both of which are hit on nearly every
  // request. REST avoids exhausting a serverless host's concurrent
  // TCP-connection cap under auto-scaling (see docs/10-backend-design.md,
  // "Deploying: Vercel"). Falls back to undefined in local/offline dev,
  // where redis.module.ts detects the absence and uses ioredis against
  // REDIS_URL instead (docker-compose's local Redis has no REST endpoint).
  upstash: {
    restUrl: process.env.UPSTASH_REDIS_REST_URL ?? '',
    restToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
    appleClientId: process.env.APPLE_CLIENT_ID ?? '',
    appleTeamId: process.env.APPLE_TEAM_ID ?? '',
    appleKeyId: process.env.APPLE_KEY_ID ?? '',
  },

  // Generic S3-compatible object storage — works against Supabase Storage,
  // Cloudflare R2, self-hosted MinIO, or real AWS S3 by changing these vars
  // only (see storage/storage.service.ts and README.md for provider-specific
  // endpoint formats).
  storage: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    publicUrl: process.env.S3_PUBLIC_URL ?? 'http://localhost:9000',
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
});
