import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { AuthError } from '@/common/errors/auth-error.js';
import { sendCreated, sendNoContent, sendSuccess } from '@/common/utils/response.js';
import {
  clearAuthCookies,
  getRefreshTokenFromRequest,
  setAuthCookies,
  tokenTransportIncludesBody
} from '@/modules/auth/auth.cookies.js';
import { authService, type AuthService } from '@/modules/auth/auth.service.js';
import type { AuthRequestContext, AuthResponse, AuthResult } from '@/modules/auth/auth.types.js';
import type {
  GoogleOAuthLoginInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput
} from '@/modules/auth/auth.schemas.js';

type AuthContextRequest = Pick<Request, 'body' | 'header' | 'ip'>;

const getAuthContext = (req: AuthContextRequest): AuthRequestContext => {
  const context: AuthRequestContext = {};
  const userAgent = req.header('user-agent');

  if (userAgent) {
    context.userAgent = userAgent;
  }
  if (req.ip) {
    context.ipAddress = req.ip;
  }
  if (typeof req.body === 'object' && req.body && 'deviceId' in req.body && req.body.deviceId) {
    context.deviceId = String(req.body.deviceId);
  }

  return context;
};

const toAuthResponse = (result: AuthResult): AuthResponse => ({
  user: result.user,
  ...(tokenTransportIncludesBody() ? { tokens: result.tokens } : {})
});

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = async (req: Request<ParamsDictionary, unknown, RegisterInput>, res: Response) => {
    const result = await this.service.register(req.body, getAuthContext(req));
    setAuthCookies(res, result.tokens);
    return sendCreated(res, toAuthResponse(result));
  };

  login = async (req: Request<ParamsDictionary, unknown, LoginInput>, res: Response) => {
    const result = await this.service.login(req.body, getAuthContext(req));
    setAuthCookies(res, result.tokens);
    return sendSuccess(res, toAuthResponse(result));
  };

  googleLogin = async (
    req: Request<ParamsDictionary, unknown, GoogleOAuthLoginInput>,
    res: Response
  ) => {
    const result = await this.service.loginWithGoogle(req.body, getAuthContext(req));
    setAuthCookies(res, result.tokens);
    return sendSuccess(res, toAuthResponse(result));
  };

  me = async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthError({ messageKey: 'errors.auth.missingUser' });
    }

    const user = await this.service.getCurrentUser(req.user.id);
    return sendSuccess(res, { user });
  };

  refresh = async (req: Request<ParamsDictionary, unknown, RefreshTokenInput>, res: Response) => {
    const refreshToken = req.body.refreshToken ?? getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      throw new AuthError({
        messageKey: 'errors.auth.missingRefreshToken',
        code: 'AUTH_MISSING_REFRESH_TOKEN'
      });
    }

    const tokens = await this.service.refresh({ ...req.body, refreshToken }, getAuthContext(req));
    setAuthCookies(res, tokens);
    return sendSuccess(res, tokenTransportIncludesBody() ? { tokens } : {});
  };

  logout = async (req: Request<ParamsDictionary, unknown, LogoutInput>, res: Response) => {
    const refreshToken = req.body.refreshToken ?? getRefreshTokenFromRequest(req);
    await this.service.logout(refreshToken ? { refreshToken } : {});
    clearAuthCookies(res);
    return sendNoContent(res);
  };
}

export const authController = new AuthController();
