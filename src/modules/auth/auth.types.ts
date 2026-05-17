import type { User, UserRole } from '@prisma/client';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type AuthResult = {
  user: PublicUser;
  tokens: TokenPair;
};

export type AuthRequestContext = {
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
};

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatarUrl: user.avatarUrl,
  emailVerifiedAt: user.emailVerifiedAt,
  createdAt: user.createdAt
});
