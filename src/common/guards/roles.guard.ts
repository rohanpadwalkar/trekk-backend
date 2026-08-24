import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole, ROLES_KEY } from '../decorators/roles.decorator';
import { RequestUser } from '../interfaces/request-user.interface';

/**
 * Role-level check only (e.g. "must have 'vendor' in roles"). This guard runs
 * after JwtAuthGuard has populated req.user. Resource-level ownership checks
 * (e.g. "is this specific trek yours") are NOT handled here — they live in
 * the service methods, because a role guard has no way to know which
 * resource a given request is trying to touch.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(`Requires one of the following roles: ${requiredRoles.join(', ')}`);
    }
    return true;
  }
}
