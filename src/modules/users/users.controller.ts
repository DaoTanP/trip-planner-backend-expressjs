import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { AuthError } from '@/common/errors/auth-error.js';
import { sendSuccess } from '@/common/utils/response.js';
import type { UpdateProfileInput } from '@/modules/users/users.schemas.js';
import { usersService, type UsersService } from '@/modules/users/users.service.js';

const getUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class UsersController {
  constructor(private readonly service: UsersService = usersService) {}

  me = async (req: Request, res: Response) => {
    const user = await this.service.getProfile(getUserId(req));
    return sendSuccess(res, { user });
  };

  updateMe = async (req: Request<ParamsDictionary, unknown, UpdateProfileInput>, res: Response) => {
    const user = await this.service.updateProfile(getUserId(req), req.body);
    return sendSuccess(res, { user });
  };
}

export const usersController = new UsersController();
