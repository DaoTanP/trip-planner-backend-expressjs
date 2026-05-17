import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';

import { AuthError } from '@/common/errors/auth-error.js';
import { env } from '@/config/env.js';

export type AccessTokenPayload = JwtPayload & {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access';
};

export type RefreshTokenPayload = JwtPayload & {
  sub: string;
  tokenId: string;
  familyId: string;
  type: 'refresh';
};

export const signAccessToken = (input: {
  userId: string;
  email: string;
  role: UserRole;
}): string =>
  jwt.sign(
    {
      sub: input.userId,
      email: input.email,
      role: input.role,
      type: 'access'
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn']
    }
  );

export const signRefreshToken = (input: {
  userId: string;
  tokenId: string;
  familyId: string;
}): string =>
  jwt.sign(
    {
      sub: input.userId,
      tokenId: input.tokenId,
      familyId: input.familyId,
      type: 'refresh'
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: `${env.JWT_REFRESH_EXPIRES_IN_DAYS}d` as SignOptions['expiresIn']
    }
  );

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (payload.type !== 'access' || !payload.sub) {
      throw new AuthError('Invalid access token');
    }
    return payload;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (payload.type !== 'refresh' || !payload.sub || !payload.tokenId || !payload.familyId) {
      throw new AuthError('Invalid refresh token');
    }
    return payload;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Invalid or expired refresh token');
  }
};
