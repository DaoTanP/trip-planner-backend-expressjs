import type { NotificationType, Prisma } from '@prisma/client';

import { NotFoundError } from '@/common/errors/not-found-error.js';
import { enqueueNotificationDelivery } from '@/jobs/notification.queue.js';
import {
  notificationsRepository,
  type NotificationsRepository
} from '@/modules/notifications/notifications.repository.js';
import type { ListNotificationsQuery } from '@/modules/notifications/notifications.schemas.js';
import {
  renderNotificationTemplate,
  type NotificationTemplateParams
} from '@/modules/notifications/notifications.templates.js';
import { usersService, type UsersService } from '@/modules/users/users.service.js';

export type CreateNotificationFromTemplateInput = {
  userId: string;
  type: NotificationType;
  tripId?: string;
  params?: NotificationTemplateParams;
};

export class NotificationsService {
  constructor(
    private readonly repository: NotificationsRepository = notificationsRepository,
    private readonly users: UsersService = usersService
  ) {}

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
    const preferences = await this.users.getLocalizationPreferences(input.userId);
    const rendered = renderNotificationTemplate(
      input.type,
      input.params
        ? {
            locale: preferences.locale,
            timezone: preferences.timezone,
            params: input.params
          }
        : {
            locale: preferences.locale,
            timezone: preferences.timezone
          }
    );
    const templateData: Prisma.InputJsonObject = {
      template: rendered.data.template,
      locale: rendered.data.locale,
      timezone: rendered.data.timezone,
      params: rendered.data.params
    };

    const data: Prisma.NotificationUncheckedCreateInput = {
      userId: input.userId,
      type: input.type,
      title: rendered.title,
      body: rendered.body,
      data: templateData
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
