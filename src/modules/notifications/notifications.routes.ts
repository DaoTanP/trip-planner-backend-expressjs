import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { notificationsController } from '@/modules/notifications/notifications.controller.js';
import {
  listNotificationsSchema,
  notificationIdSchema
} from '@/modules/notifications/notifications.schemas.js';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);
notificationsRouter.get('/', validateRequest(listNotificationsSchema), asyncHandler(notificationsController.list));
notificationsRouter.patch(
  '/:notificationId/read',
  validateRequest(notificationIdSchema),
  asyncHandler(notificationsController.markRead)
);
