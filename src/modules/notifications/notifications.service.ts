import { NotFoundError } from '@/common/errors/not-found-error.js';
import {
  notificationsRepository,
  type NotificationsRepository
} from '@/modules/notifications/notifications.repository.js';
import type { ListNotificationsQuery } from '@/modules/notifications/notifications.schemas.js';

export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository = notificationsRepository) {}

  list(userId: string, query: ListNotificationsQuery) {
    return this.repository.list(userId, query);
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.repository.markRead(notificationId, userId);
    if (!notification) {
      throw new NotFoundError('Notification');
    }

    return notification;
  }
}

export const notificationsService = new NotificationsService();
