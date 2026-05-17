import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { usersController } from '@/modules/users/users.controller.js';
import { updateProfileSchema } from '@/modules/users/users.schemas.js';

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.get('/me', asyncHandler(usersController.me));
usersRouter.patch('/me', validateRequest(updateProfileSchema), asyncHandler(usersController.updateMe));
