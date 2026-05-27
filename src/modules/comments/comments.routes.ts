import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { commentsController } from '@/modules/comments/comments.controller.js';
import { listCommentsSchema } from '@/modules/comments/comments.schemas.js';

export const commentsRouter = Router();

commentsRouter.use(authenticate);
commentsRouter.get(
  '/trips/:tripId/comments',
  validateRequest(listCommentsSchema),
  asyncHandler(commentsController.list)
);
