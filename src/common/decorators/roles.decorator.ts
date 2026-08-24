import { SetMetadata } from '@nestjs/common';

export type AppRole = 'trekker' | 'vendor' | 'admin';

export const ROLES_KEY = 'roles';

/**
 * Marks a route as requiring the caller to hold at least one of the given roles.
 * Checked by RolesGuard against req.user.roles (populated by JwtAuthGuard).
 *
 * This is a ROLE check only — it does not know or care which specific resource
 * is being touched. Resource ownership (e.g. "only the organizer can edit this
 * trek") is a separate, explicit check inside the relevant service method.
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
