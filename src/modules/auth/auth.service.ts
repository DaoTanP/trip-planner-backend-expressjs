import bcrypt from 'bcryptjs';
import type { Prisma, User } from '@prisma/client';

import { AuthError } from '@/common/errors/auth-error.js';
import { ConflictError } from '@/common/errors/conflict-error.js';
import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  normalizeLocale
} from '@/common/localization/locales.js';
import { sha256, createUuid } from '@/common/utils/crypto.js';
import { addDays } from '@/common/utils/date.js';
import { env } from '@/config/env.js';
import { authRepository, type AuthRepository } from '@/modules/auth/auth.repository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/modules/auth/auth.tokens.js';
import type {
  GoogleOAuthLoginInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput
} from '@/modules/auth/auth.schemas.js';
import type {
  AuthRequestContext,
  AuthResult,
  TokenPair,
  VerifiedOAuthProfile
} from '@/modules/auth/auth.types.js';
import { toPublicUser } from '@/modules/auth/auth.types.js';
import {
  oauthProviderRegistry,
  type OAuthProviderRegistry
} from '@/modules/auth/providers/oauth-provider.registry.js';

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
  constructor(
    private readonly repository: AuthRepository = authRepository,
    private readonly oauthProviders: OAuthProviderRegistry = oauthProviderRegistry
  ) {}

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

  async loginWithGoogle(input: GoogleOAuthLoginInput, context: AuthRequestContext): Promise<AuthResult> {
    const profile = await this.oauthProviders.get('GOOGLE').verifyCredential(input.credential);

    if (!profile.emailVerified) {
      throw new AuthError({ messageKey: 'errors.auth.oauthEmailNotVerified' });
    }

    const existingAccount = await this.repository.findOAuthAccount(
      profile.provider,
      profile.providerUserId
    );

    if (existingAccount) {
      this.ensureUserCanAuthenticate(existingAccount.user);
      await this.repository.updateOAuthAccount(existingAccount.id, {
        profile: profile.profile
      });

      return {
        user: toPublicUser(existingAccount.user),
        tokens: await this.issueTokenPair({
          userId: existingAccount.user.id,
          email: existingAccount.user.email,
          role: existingAccount.user.role,
          context: withDeviceId(context, input.deviceId)
        })
      };
    }

    const userByEmail = await this.repository.findUserByEmail(profile.email);
    const now = new Date();
    const oauthAccount = this.buildOAuthAccountCreateInput(profile);

    let user: User;

    if (userByEmail) {
      user = await this.linkOAuthAccountToExistingUser(userByEmail, oauthAccount);
    } else {
      const userData: Prisma.UserCreateInput = {
        email: profile.email,
        name: profile.name,
        emailVerifiedAt: now,
        locale: input.locale ?? normalizeLocale(profile.locale) ?? DEFAULT_LOCALE,
        timezone: input.timezone ?? DEFAULT_TIMEZONE
      };

      if (profile.avatarUrl) {
        userData.avatarUrl = profile.avatarUrl;
      }

      user = await this.repository.createUserWithOAuthAccount({
        user: userData,
        oauthAccount
      });
    }

    this.ensureUserCanAuthenticate(user);

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

  async getCurrentUser(userId: string): Promise<AuthResult['user']> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new AuthError({ messageKey: 'errors.auth.invalidSession' });
    }

    this.ensureUserCanAuthenticate(user);

    return toPublicUser(user);
  }

  async refresh(
    input: RefreshTokenInput & { refreshToken: string },
    context: AuthRequestContext
  ): Promise<TokenPair> {
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

  async logout(input: LogoutInput & { refreshToken?: string }): Promise<void> {
    if (!input.refreshToken) {
      return;
    }

    const tokenHash = sha256(input.refreshToken);
    const persistedToken = await this.repository.findRefreshTokenByHash(tokenHash);

    if (persistedToken && !persistedToken.revokedAt) {
      await this.repository.revokeRefreshToken(persistedToken.id);
    }
  }

  private ensureUserCanAuthenticate(user: User): void {
    if (user.status === 'DISABLED') {
      throw new AuthError({ messageKey: 'errors.auth.accountDisabled' });
    }
  }

  private buildOAuthAccountCreateInput(
    profile: VerifiedOAuthProfile
  ): Omit<Prisma.OAuthAccountUncheckedCreateInput, 'userId'> {
    return {
      provider: profile.provider,
      providerUserId: profile.providerUserId,
      profile: profile.profile
    };
  }

  private async linkOAuthAccountToExistingUser(
    user: User,
    oauthAccount: Omit<Prisma.OAuthAccountUncheckedCreateInput, 'userId'>
  ): Promise<User> {
    this.ensureUserCanAuthenticate(user);

    await this.repository.linkOAuthAccount(user.id, oauthAccount);

    return user;
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
