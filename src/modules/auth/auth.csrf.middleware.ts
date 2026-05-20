import type { RequestHandler } from 'express';

import { AuthError } from '@/common/errors/auth-error.js';
import { secureCompare } from '@/common/utils/crypto.js';
import {
  getAccessTokenFromRequest,
  getCsrfTokenFromRequest,
  getRefreshTokenFromRequest,
  tokenTransportIncludesCookies
} from '@/modules/auth/auth.cookies.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATH_SUFFIXES = ['/auth/login', '/auth/register', '/auth/oauth/google'];

export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (
    !tokenTransportIncludesCookies() ||
    SAFE_METHODS.has(req.method) ||
    CSRF_EXEMPT_PATH_SUFFIXES.some((path) => req.path.endsWith(path))
  ) {
    next();
    return;
  }

  const hasAuthCookie = Boolean(getAccessTokenFromRequest(req) || getRefreshTokenFromRequest(req));
  const hasBearer = req.header('authorization')?.startsWith('Bearer ') ?? false;

  if (!hasAuthCookie || hasBearer) {
    next();
    return;
  }

  const csrfCookie = getCsrfTokenFromRequest(req);
  const csrfHeader = req.header('x-csrf-token');

  if (!csrfCookie || !csrfHeader || !secureCompare(csrfCookie, csrfHeader)) {
    next(new AuthError({ messageKey: 'errors.auth.invalidCsrfToken', code: 'AUTH_CSRF_INVALID' }));
    return;
  }

  next();
};
