import type { CookieOptions, Request, Response } from 'express';

import { createUuid } from '@/common/utils/crypto.js';
import { env } from '@/config/env.js';
import type { TokenPair } from '@/modules/auth/auth.types.js';

const durationPattern = /^(\d+)([smhd])?$/i;

const parseDurationMs = (value: string): number | undefined => {
  const match = durationPattern.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const rawAmount = match[1];
  if (!rawAmount) {
    return undefined;
  }

  const amount = Number(rawAmount);
  const unit = match[2]?.toLowerCase() ?? 's';

  switch (unit) {
    case 'd':
      return amount * 86_400_000;
    case 'h':
      return amount * 3_600_000;
    case 'm':
      return amount * 60_000;
    default:
      return amount * 1_000;
  }
};

const getCookieOptions = (maxAge?: number, httpOnly = true): CookieOptions => ({
  httpOnly,
  secure: env.AUTH_COOKIE_SECURE,
  sameSite: env.AUTH_COOKIE_SAME_SITE,
  path: '/',
  ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
  ...(maxAge ? { maxAge } : {})
});

const getCookieBag = (req: Request): Record<string, string | undefined> =>
  (req.cookies ?? {}) as Record<string, string | undefined>;

export const tokenTransportIncludesCookies = () =>
  env.AUTH_TOKEN_TRANSPORT === 'cookie' || env.AUTH_TOKEN_TRANSPORT === 'both';

export const tokenTransportIncludesBody = () =>
  env.AUTH_TOKEN_TRANSPORT === 'body' || env.AUTH_TOKEN_TRANSPORT === 'both';

export const getAccessTokenFromRequest = (req: Request): string | null =>
  getCookieBag(req)[env.AUTH_ACCESS_COOKIE_NAME] ?? null;

export const getRefreshTokenFromRequest = (req: Request): string | null =>
  getCookieBag(req)[env.AUTH_REFRESH_COOKIE_NAME] ?? null;

export const getCsrfTokenFromRequest = (req: Request): string | null =>
  getCookieBag(req)[env.AUTH_CSRF_COOKIE_NAME] ?? null;

export const setAuthCookies = (res: Response, tokens: TokenPair): void => {
  if (!tokenTransportIncludesCookies()) {
    return;
  }

  res.cookie(
    env.AUTH_ACCESS_COOKIE_NAME,
    tokens.accessToken,
    getCookieOptions(parseDurationMs(tokens.expiresIn))
  );
  res.cookie(
    env.AUTH_REFRESH_COOKIE_NAME,
    tokens.refreshToken,
    getCookieOptions(env.JWT_REFRESH_EXPIRES_IN_DAYS * 86_400_000)
  );
  res.cookie(
    env.AUTH_CSRF_COOKIE_NAME,
    createUuid(),
    getCookieOptions(env.JWT_REFRESH_EXPIRES_IN_DAYS * 86_400_000, false)
  );
};

export const clearAuthCookies = (res: Response): void => {
  const options = getCookieOptions();

  res.clearCookie(env.AUTH_ACCESS_COOKIE_NAME, options);
  res.clearCookie(env.AUTH_REFRESH_COOKIE_NAME, options);
  res.clearCookie(env.AUTH_CSRF_COOKIE_NAME, { ...options, httpOnly: false });
};
