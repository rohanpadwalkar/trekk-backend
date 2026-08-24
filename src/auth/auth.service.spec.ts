import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { hashToken } from './utils/token.util';

/**
 * Unit tests for the highest-risk piece of the backend design (flagged as a
 * tech-lead risk area in docs/10-backend-design.md): refresh token rotation
 * with reuse detection. These run against mocked Mongoose models — no real
 * MongoDB connection — so they exercise the actual rotation/theft-detection
 * logic in isolation.
 */
describe('AuthService — refresh token rotation', () => {
  let authService: AuthService;
  let refreshTokenDocs: Map<string, any>;
  let userDocs: Map<string, any>;

  const config = {
    get: (key: string) => {
      const values: Record<string, string> = {
        'jwt.accessSecret': 'test-access-secret',
        'jwt.refreshSecret': 'test-refresh-secret',
        'jwt.accessExpiresIn': '15m',
        'jwt.refreshExpiresIn': '30d',
        'oauth.googleClientId': '',
      };
      return values[key];
    },
  } as ConfigService;

  const jwtService = new JwtService();

  function makeRefreshTokenModel() {
    return {
      findOne: jest.fn(async (filter: any) => {
        for (const doc of refreshTokenDocs.values()) {
          if (doc.tokenHash === filter.tokenHash) return doc;
        }
        return null;
      }),
      create: jest.fn(async (data: any) => {
        const doc = {
          ...data,
          _id: `rt_${refreshTokenDocs.size + 1}`,
          save: async function () {
            refreshTokenDocs.set(this._id, this);
          },
        };
        refreshTokenDocs.set(doc._id, doc);
        return doc;
      }),
      updateMany: jest.fn(async (filter: any, update: any) => {
        for (const doc of refreshTokenDocs.values()) {
          if (doc.family === filter.family) Object.assign(doc, update);
        }
      }),
    };
  }

  function makeUserModel(user: any) {
    userDocs = new Map([[user._id, user]]);
    return {
      findById: jest.fn(async (id: string) => userDocs.get(id) ?? null),
      findOne: jest.fn(async () => null),
      create: jest.fn(),
    };
  }

  let user: any;

  beforeEach(() => {
    refreshTokenDocs = new Map();
    user = {
      _id: 'user_1',
      roles: ['trekker'],
      verified: false,
      refreshTokenFamily: null,
      save: async function () {},
    };
    authService = new AuthService(makeUserModel(user) as any, makeRefreshTokenModel() as any, jwtService, config);
  });

  it('rejects login with a wrong password', async () => {
    user.passwordHash = await argon2.hash('correct-password');
    (authService as any).userModel.findOne = jest.fn(async () => user);

    await expect(authService.login({ email: 'x@example.com', password: 'wrong-password' } as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rotates the refresh token on a valid refresh call', async () => {
    (authService as any).userModel.findOne = jest.fn(async () => user);
    user.passwordHash = await argon2.hash('correct-password');

    const { tokens } = await authService.login({ email: 'x@example.com', password: 'correct-password' } as any);
    const firstRefreshToken = tokens.refreshToken;

    const rotated = await authService.refresh(firstRefreshToken);
    expect(rotated.refreshToken).not.toEqual(firstRefreshToken);

    const originalDoc = [...refreshTokenDocs.values()].find((d) => d.tokenHash === hashToken(firstRefreshToken));
    expect(originalDoc.revoked).toBe(true);
  });

  it('detects refresh token reuse and revokes the entire family', async () => {
    (authService as any).userModel.findOne = jest.fn(async () => user);
    user.passwordHash = await argon2.hash('correct-password');

    const { tokens } = await authService.login({ email: 'x@example.com', password: 'correct-password' } as any);
    const firstRefreshToken = tokens.refreshToken;

    // Legitimate rotation.
    const rotated = await authService.refresh(firstRefreshToken);

    // An attacker replays the OLD (already-rotated/revoked) refresh token.
    await expect(authService.refresh(firstRefreshToken)).rejects.toThrow(UnauthorizedException);

    // The theft-detection response should have revoked the entire family —
    // so even the legitimately-rotated token from the same family is now dead.
    await expect(authService.refresh(rotated.refreshToken)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unknown refresh token', async () => {
    await expect(authService.refresh('not-a-real-token')).rejects.toThrow(UnauthorizedException);
  });
});
