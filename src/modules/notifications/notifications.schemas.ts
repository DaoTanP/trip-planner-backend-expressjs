import { NotificationStatus } from '@prisma/client';
import { z } from 'zod';

export const listNotificationsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(NotificationStatus).optional(),
    limit: z.coerce.number().int().positive().max(100).default(20)
  })
});

export const notificationIdSchema = z.object({
  params: z.object({
    notificationId: z.string().uuid()
  })
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>['query'];
export type NotificationIdParams = z.infer<typeof notificationIdSchema>['params'];
