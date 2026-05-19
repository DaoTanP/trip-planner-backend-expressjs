import type { Notification, NotificationStatus, Prisma } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

export class NotificationsRepository {
  create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return prisma.notification.create({
      data
    });
  }

  list(userId: string, filters: { status?: NotificationStatus; limit: number }): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(filters.status ? { status: filters.status } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit
    });
  }

  markRead(id: string, userId: string): Promise<Notification | null> {
    return prisma.$transaction(async (tx) => {
      const result = await tx.notification.updateMany({
        where: { id, userId },
        data: {
          status: 'READ',
          readAt: new Date()
        }
      });

      if (result.count === 0) {
        return null;
      }

      return tx.notification.findUnique({
        where: { id }
      });
    });
  }
}

export const notificationsRepository = new NotificationsRepository();
