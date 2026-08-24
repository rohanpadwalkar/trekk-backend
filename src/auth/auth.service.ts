import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { User, UserDocument } from '../database/schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from '../database/schemas/refresh-token.schema';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { generateOpaqueToken, hashToken, parseDurationMs } from './utils/token.util';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('oauth.googleClientId'));
  }

  async signup(dto: SignupDto): Promise<{ user: UserDocument; tokens: TokenPair }> {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await argon2.hash(dto.password);
    const roles = Array.from(new Set(['trekker', ...dto.roles]));

    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
      roles,
    });

    if (roles.includes('vendor')) {
      user.vendorProfile = { businessName: dto.name, rating: 0, ratingCount: 0 };
      await user.save();
    }

    const tokens = await this.issueTokenPair(user);
    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: UserDocument; tokens: TokenPair }> {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (!user || !user.passwordHash) {
      // Same message whether the email doesn't exist or the account is OAuth-only —
      // don't leak which one it is.
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.issueTokenPair(user);
    return { user, tokens };
  }

  async loginWithGoogle(idToken: string): Promise<{ user: UserDocument; tokens: TokenPair }> {
    const audience = this.config.get<string>('oauth.googleClientId');
    const ticket = await this.googleClient.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Google token.');
    }

    const user = await this.findOrCreateOAuthUser({
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0],
    });

    const tokens = await this.issueTokenPair(user);
    return { user, tokens };
  }

  async loginWithApple(identityToken: string): Promise<{ user: UserDocument; tokens: TokenPair }> {
    const appleClientId = this.config.get<string>('oauth.appleClientId');
    let sub: string;
    let email: string | undefined;
    try {
      const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: 'https://appleid.apple.com',
        audience: appleClientId || undefined,
      });
      sub = payload.sub as string;
      email = payload.email as string | undefined;
    } catch (err) {
      this.logger.warn(`Apple identity token verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid Apple token.');
    }

    if (!sub) {
      throw new UnauthorizedException('Invalid Apple token.');
    }

    // Apple only sends a name on the very first sign-in, and only if the client
    // forwards it — this endpoint's contract (per docs/10-backend-design.md) is
    // just { identityToken }, so we fall back to a placeholder derived from the
    // relay email. A future iteration could accept an optional `name` field.
    const fallbackEmail = email ?? `${sub}@privaterelay.appleid.com`;
    const user = await this.findOrCreateOAuthUser({
      provider: 'apple',
      providerId: sub,
      email: fallbackEmail,
      name: fallbackEmail.split('@')[0],
    });

    const tokens = await this.issueTokenPair(user);
    return { user, tokens };
  }

  private async findOrCreateOAuthUser(params: {
    provider: 'google' | 'apple';
    providerId: string;
    email: string;
    name: string;
  }): Promise<UserDocument> {
    const { provider, providerId, email, name } = params;

    let user = await this.userModel.findOne({
      authProviders: { $elemMatch: { provider, providerId } },
    });
    if (user) return user;

    // Link to an existing email/password account rather than creating a duplicate.
    user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (user) {
      user.authProviders.push({ provider, providerId });
      await user.save();
      return user;
    }

    return this.userModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash: null,
      authProviders: [{ provider, providerId }],
      roles: ['trekker'],
    });
  }

  /**
   * Refresh rotation with reuse detection: every call issues a brand new
   * access+refresh pair and revokes the old refresh token. If a refresh
   * token is presented that's ALREADY revoked, that's a signal it was
   * stolen and replayed (the legitimate device would have gotten the new
   * one) — so the entire rotation family is revoked, forcing re-login on
   * every device sharing that session.
   */
  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(rawRefreshToken);
    const existing = await this.refreshTokenModel.findOne({ tokenHash });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (existing.revoked) {
      await this.refreshTokenModel.updateMany({ family: existing.family }, { revoked: true });
      this.logger.warn(`Refresh token reuse detected for family ${existing.family} — session revoked.`);
      throw new UnauthorizedException('Session has been revoked. Please log in again.');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired. Please log in again.');
    }

    const user = await this.userModel.findById(existing.userId);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }

    existing.revoked = true;
    await existing.save();

    return this.issueTokenPair(user, existing.family);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    const existing = await this.refreshTokenModel.findOne({ tokenHash });
    if (!existing) return; // already gone — logout is idempotent
    await this.refreshTokenModel.updateMany({ family: existing.family }, { revoked: true });
  }

  async getSession(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Account no longer exists.');
    }
    return user;
  }

  private async issueTokenPair(user: UserDocument, existingFamily?: string): Promise<TokenPair> {
    const family = existingFamily ?? randomUUID();

    const accessToken = this.jwtService.sign(
      { sub: (user._id as Types.ObjectId).toString(), roles: user.roles, verified: user.verified },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      },
    );

    const refreshToken = generateOpaqueToken();
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn')!;
    const expiresAt = new Date(Date.now() + parseDurationMs(refreshExpiresIn));

    await this.refreshTokenModel.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      family,
      revoked: false,
      expiresAt,
    });

    // Informational marker of the most recent session family — the actual
    // rotation/reuse-detection logic operates on the refreshTokens
    // collection, which correctly supports multiple concurrent devices.
    user.refreshTokenFamily = family;
    await user.save();

    return { accessToken, refreshToken };
  }
}
