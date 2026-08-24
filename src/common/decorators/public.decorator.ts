import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication. JwtAuthGuard is applied
 * globally (see app.module.ts / main.ts) so every route needs a token
 * UNLESS it is explicitly marked @Public().
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
