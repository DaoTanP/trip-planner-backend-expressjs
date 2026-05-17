import { Router } from 'express';

import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { authController } from '@/modules/auth/auth.controller.js';
import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema
} from '@/modules/auth/auth.schemas.js';

export const authRouter = Router();

authRouter.post('/register', validateRequest(registerSchema), asyncHandler(authController.register));
authRouter.post('/login', validateRequest(loginSchema), asyncHandler(authController.login));
authRouter.post('/refresh', validateRequest(refreshTokenSchema), asyncHandler(authController.refresh));
authRouter.post('/logout', validateRequest(logoutSchema), asyncHandler(authController.logout));
