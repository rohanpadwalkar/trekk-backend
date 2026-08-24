/* eslint-disable no-console */
// Standalone smoke test for RedisService + RedisThrottlerStorage against a
// real local Redis — no Nest bootstrap, no Mongo required. Run with:
//   npx ts-node -r tsconfig-paths/register scripts/smoke-redis.ts
import { RedisService } from '../src/redis/redis.service';
import { RedisThrottlerStorage } from '../src/redis/throttler-storage.redis';

async function main() {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

  const redis = new RedisService(redisUrl);
  await redis.set('smoke:key', { hello: 'world' }, 5);
  const value = await redis.get<{ hello: string }>('smoke:key');
  console.assert(value?.hello === 'world', 'RedisService.get/set roundtrip failed');
  console.log('RedisService.get/set OK ->', value);

  await redis.set('smoke:prefix:a', 1);
  await redis.set('smoke:prefix:b', 2);
  await redis.delByPrefix('smoke:prefix:');
  const afterA = await redis.get('smoke:prefix:a');
  const afterB = await redis.get('smoke:prefix:b');
  console.assert(afterA === null && afterB === null, 'delByPrefix failed to clear keys');
  console.log('RedisService.delByPrefix OK');

  const storage = new RedisThrottlerStorage(redisUrl);
  const throttlerName = `smoke-${Date.now()}`;
  let lastRecord;
  for (let i = 0; i < 5; i++) {
    lastRecord = await storage.increment('client-1', 60, 3, 30, throttlerName);
    console.log(`increment #${i + 1}:`, lastRecord);
  }
  console.assert(lastRecord!.isBlocked === true, 'Throttler storage should have blocked after exceeding limit');
  console.log('RedisThrottlerStorage.increment OK — correctly blocked after limit exceeded');

  await redis.del('smoke:key');
  await redis.onModuleDestroy();
  console.log('\nAll Redis smoke checks passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
