import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';

import { AuthError } from '@/common/errors/auth-error.js';
import { ConflictError } from '@/common/errors/conflict-error.js';
import { sha256, createUuid } from '@/common/utils/crypto.js';
import { addDays } from '@/common/utils/date.js';
import { env } from '@/config/env.js';
import { authRepository, type AuthRepository } from '@/modules/auth/auth.repository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/modules/auth/auth.tokens.js';
import type { LoginInput, LogoutInput, RefreshTokenInput, RegisterInput } from '@/modules/auth/auth.schemas.js';
import type { AuthRequestContext, AuthResult, TokenPair } from '@/modules/auth/auth.types.js';
import { toPublicUser } from '@/modules/auth/auth.types.js';

const withDeviceId = (context: AuthRequestContext, deviceId?: string): AuthRequestContext => {
  if (!deviceId) {
    return context;
  }

  return {
    ...context,
    deviceId
  };
};

export class AuthService {
  constructor(private readonly repository: AuthRepository = authRepository) {}

  async register(input: RegisterInput, context: AuthRequestContext): Promise<AuthResult> {
    const existingUser = await this.repository.findUserByEmail(input.email);
    if (existingUser) {
      throw new ConflictError({ messageKey: 'errors.conflict.emailRegistered' });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.repository.createUser({
      email: input.email,
      name: input.name,
      locale: input.locale,
      timezone: input.timezone,
      passwordHash
    });

    return {
      user: toPublicUser(user),
      tokens: await this.issueTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
        context
      })
    };
  }

  async login(input: LoginInput, context: AuthRequestContext): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(input.email);
    if (!user?.passwordHash) {
      throw new AuthError({ messageKey: 'errors.auth.invalidCredentials' });
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AuthError({ messageKey: 'errors.auth.invalidCredentials' });
    }

    if (user.status === 'DISABLED') {
      throw new AuthError({ messageKey: 'errors.auth.accountDisabled' });
    }

    return {
      user: toPublicUser(user),
      tokens: await this.issueTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role,
        context: withDeviceId(context, input.deviceId)
      })
    };
  }

  async refresh(input: RefreshTokenInput, context: AuthRequestContext): Promise<TokenPair> {
    const payload = verifyRefreshToken(input.refreshToken);
    const tokenHash = sha256(input.refreshToken);
    const persistedToken = await this.repository.findRefreshTokenByHash(tokenHash);

    if (
      !persistedToken ||
      persistedToken.id !== payload.tokenId ||
      persistedToken.userId !== payload.sub ||
      persistedToken.familyId !== payload.familyId
    ) {
      throw new AuthError({ messageKey: 'errors.auth.refreshTokenNotRecognized' });
    }

    if (persistedToken.revokedAt) {
      await this.repository.revokeTokenFamily(persistedToken.familyId);
      throw new AuthError({ messageKey: 'errors.auth.refreshTokenReuseDetected' });
    }

    if (persistedToken.expiresAt.getTime() <= Date.now()) {
      await this.repository.revokeRefreshToken(persistedToken.id);
      throw new AuthError({ messageKey: 'errors.auth.refreshTokenExpired' });
    }

    if (persistedToken.user.status === 'DISABLED') {
      await this.repository.revokeTokenFamily(persistedToken.familyId);
      throw new AuthError({ messageKey: 'errors.auth.accountDisabled' });
    }

    await this.repository.revokeRefreshToken(persistedToken.id);

    return this.issueTokenPair({
      userId: persistedToken.user.id,
      email: persistedToken.user.email,
      role: persistedToken.user.role,
      familyId: persistedToken.familyId,
      context: withDeviceId(context, input.deviceId)
    });
  }

  async logout(input: LogoutInput): Promise<void> {
    const tokenHash = sha256(input.refreshToken);
    const persistedToken = await this.repository.findRefreshTokenByHash(tokenHash);

    if (persistedToken && !persistedToken.revokedAt) {
      await this.repository.revokeRefreshToken(persistedToken.id);
    }
  }

  private async issueTokenPair(input: {
    userId: string;
    email: string;
    role: AuthResult['user']['role'];
    context: AuthRequestContext;
    familyId?: string;
  }): Promise<TokenPair> {
    const tokenId = createUuid();
    const familyId = input.familyId ?? createUuid();
    const refreshToken = signRefreshToken({
      userId: input.userId,
      tokenId,
      familyId
    });

    const refreshTokenData: Prisma.RefreshTokenUncheckedCreateInput = {
      id: tokenId,
      userId: input.userId,
      tokenHash: sha256(refreshToken),
      familyId,
      expiresAt: addDays(new Date(), env.JWT_REFRESH_EXPIRES_IN_DAYS)
    };

    if (input.context.deviceId) refreshTokenData.deviceId = input.context.deviceId;
    if (input.context.userAgent) refreshTokenData.userAgent = input.context.userAgent;
    if (input.context.ipAddress) refreshTokenData.ipAddress = input.context.ipAddress;

    await this.repository.createRefreshToken(refreshTokenData);

    return {
      accessToken: signAccessToken({
        userId: input.userId,
        email: input.email,
        role: input.role
      }),
      refreshToken,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN
    };
  }
}

export const authService = new AuthService();
