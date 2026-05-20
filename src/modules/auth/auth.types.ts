import type { AuthProvider, Prisma, User } from '@prisma/client';

import type { AuthTokensDto, PublicUserDto } from '@/api/contracts/index.js';

export type PublicUser = PublicUserDto;

export type TokenPair = AuthTokensDto;

export type AuthResult = {
  user: PublicUser;
  tokens: TokenPair;
};

export type AuthResponse = {
  user: PublicUser;
  tokens?: TokenPair;
};

export type AuthRequestContext = {
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
};

export type VerifiedOAuthProfile = {
  provider: Exclude<AuthProvider, 'EMAIL'>;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string | null;
  locale?: string | null;
  profile: Prisma.InputJsonValue;
};

export interface OAuthProviderVerifier {
  provider: Exclude<AuthProvider, 'EMAIL'>;
  verifyCredential(credential: string): Promise<VerifiedOAuthProfile>;
}

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatarUrl: user.avatarUrl,
  locale: user.locale,
  timezone: user.timezone,
  emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  createdAt: user.createdAt.toISOString()
});
