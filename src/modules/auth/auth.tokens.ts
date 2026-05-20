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
}): string => {
  const options = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>
  } satisfies SignOptions;

  return jwt.sign(
    {
      sub: input.userId,
      email: input.email,
      role: input.role,
      type: 'access'
    },
    env.JWT_ACCESS_SECRET,
    options
  );
};

export const signRefreshToken = (input: {
  userId: string;
  tokenId: string;
  familyId: string;
}): string => {
  const options = {
    expiresIn: `${env.JWT_REFRESH_EXPIRES_IN_DAYS}d` as NonNullable<SignOptions['expiresIn']>
  } satisfies SignOptions;

  return jwt.sign(
    {
      sub: input.userId,
      tokenId: input.tokenId,
      familyId: input.familyId,
      type: 'refresh'
    },
    env.JWT_REFRESH_SECRET,
    options
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (payload.type !== 'access' || !payload.sub) {
      throw new AuthError({ messageKey: 'errors.auth.invalidAccessToken', code: 'AUTH_INVALID_SESSION' });
    }
    return payload;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError({
      messageKey: 'errors.auth.invalidOrExpiredAccessToken',
      code: 'AUTH_INVALID_SESSION'
    });
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (payload.type !== 'refresh' || !payload.sub || !payload.tokenId || !payload.familyId) {
      throw new AuthError({ messageKey: 'errors.auth.invalidRefreshToken', code: 'AUTH_INVALID_SESSION' });
    }
    return payload;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError({
      messageKey: 'errors.auth.invalidOrExpiredRefreshToken',
      code: 'AUTH_INVALID_SESSION'
    });
  }
};
