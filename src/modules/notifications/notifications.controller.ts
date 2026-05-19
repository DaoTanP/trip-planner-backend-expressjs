import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { AuthError } from '@/common/errors/auth-error.js';
import { sendSuccess } from '@/common/utils/response.js';
import type {
  ListNotificationsQuery,
  NotificationIdParams
} from '@/modules/notifications/notifications.schemas.js';
import {
  notificationsService,
  type NotificationsService
} from '@/modules/notifications/notifications.service.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class NotificationsController {
  constructor(private readonly service: NotificationsService = notificationsService) {}

  list = async (req: Request<ParamsDictionary, unknown, unknown, ListNotificationsQuery>, res: Response) => {
    const notifications = await this.service.list(requireUserId(req), req.query);
    return sendSuccess(res, { notifications });
  };

  markRead = async (req: Request<NotificationIdParams>, res: Response) => {
    const notification = await this.service.markRead(requireUserId(req), req.params.notificationId);
    return sendSuccess(res, { notification });
  };
}

export const notificationsController = new NotificationsController();
