import type { RequestHandler } from 'express';

import { AuthError } from '@/common/errors/auth-error.js';
import { AuthorizationError } from '@/common/errors/authorization-error.js';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.js';
import { verifyAccessToken } from '@/modules/auth/auth.tokens.js';

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');

  if (!header?.startsWith('Bearer ')) {
    next(new AuthError({ messageKey: 'errors.auth.missingBearer' }));
    return;
  }

  const token = header.slice('Bearer '.length);
  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role
  };

  next();
};

export const requireRole =
  (...roles: AuthenticatedUser['role'][]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      next(new AuthError({ messageKey: 'errors.auth.missingUser' }));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AuthorizationError());
      return;
    }

    next();
  };
