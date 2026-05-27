import type { Prisma } from '@prisma/client';

import { NotFoundError } from '@/common/errors/not-found-error.js';
import { enqueueNotificationDelivery } from '@/jobs/notification.queue.js';
import {
  notificationsRepository,
  type NotificationsRepository
} from '@/modules/notifications/notifications.repository.js';
import type { ListNotificationsQuery } from '@/modules/notifications/notifications.schemas.js';
import {
  serializeNotificationParams,
  type NotificationCode,
  type NotificationTemplateParams
} from '@/modules/notifications/notifications.templates.js';

export type CreateNotificationFromTemplateInput = {
  userId: string;
  notificationCode: NotificationCode;
  tripId?: string;
  params?: NotificationTemplateParams;
};

export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository = notificationsRepository) {}

  list(userId: string, query: ListNotificationsQuery) {
    const filters: { status?: ListNotificationsQuery['status']; limit: number } = {
      limit: query.limit
    };

    if (query.status !== undefined) {
      filters.status = query.status;
    }

    return this.repository.list(userId, filters);
  }

  async createFromTemplate(input: CreateNotificationFromTemplateInput) {
    const data: Prisma.NotificationUncheckedCreateInput = {
      userId: input.userId,
      notificationCode: input.notificationCode,
      params: serializeNotificationParams(input.params)
    };

    if (input.tripId !== undefined) {
      data.tripId = input.tripId;
    }

    const notification = await this.repository.create(data);
    await enqueueNotificationDelivery({
      notificationId: notification.id,
      userId: input.userId
    });

    return notification;
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.repository.markRead(notificationId, userId);
    if (!notification) {
      throw new NotFoundError({ resourceKey: 'resources.notification' });
    }

    return notification;
  }
}

export const notificationsService = new NotificationsService();
