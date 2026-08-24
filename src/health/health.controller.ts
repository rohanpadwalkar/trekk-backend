import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

/**
 * Deliberately dependency-free (no Mongo/Redis calls) — useful as a
 * platform health/uptime check target regardless of host (Vercel, Render,
 * or anything else), since it stays fast and never fails just because a
 * dependency is slow.
 */
@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
