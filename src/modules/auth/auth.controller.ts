import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { sendCreated, sendNoContent, sendSuccess } from '@/common/utils/response.js';
import { authService, type AuthService } from '@/modules/auth/auth.service.js';
import type { AuthRequestContext } from '@/modules/auth/auth.types.js';
import type {
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

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  register = async (req: Request<ParamsDictionary, unknown, RegisterInput>, res: Response) => {
    const result = await this.service.register(req.body, getAuthContext(req));
    return sendCreated(res, result);
  };

  login = async (req: Request<ParamsDictionary, unknown, LoginInput>, res: Response) => {
    const result = await this.service.login(req.body, getAuthContext(req));
    return sendSuccess(res, result);
  };

  refresh = async (req: Request<ParamsDictionary, unknown, RefreshTokenInput>, res: Response) => {
    const tokens = await this.service.refresh(req.body, getAuthContext(req));
    return sendSuccess(res, { tokens });
  };

  logout = async (req: Request<ParamsDictionary, unknown, LogoutInput>, res: Response) => {
    await this.service.logout(req.body);
    return sendNoContent(res);
  };
}

export const authController = new AuthController();
