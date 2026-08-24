import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RequestUser } from '../../common/interfaces/request-user.interface';

export interface AccessTokenPayload {
  sub: string;
  roles: string[];
  verified: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret'),
    });
  }

  // Runs only after the signature + expiry are already verified by passport-jwt.
  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    return {
      userId: payload.sub,
      roles: payload.roles as RequestUser['roles'],
      verified: payload.verified,
    };
  }
}
