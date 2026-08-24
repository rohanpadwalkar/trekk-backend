import { AppRole } from '../decorators/roles.decorator';

/** Shape of req.user once JwtAuthGuard has validated the access token. */
export interface RequestUser {
  userId: string;
  roles: AppRole[];
  verified: boolean;
}
