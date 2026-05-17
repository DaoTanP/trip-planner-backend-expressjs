import { Queue } from 'bullmq';

import { queueOptions } from '@/config/queue.js';
import { QUEUE_NAMES } from '@/jobs/queue-names.js';

export type NotificationJobData = {
  notificationId: string;
  userId: string;
};

export const notificationQueue = new Queue<NotificationJobData>(QUEUE_NAMES.NOTIFICATIONS, queueOptions);

export const enqueueNotificationDelivery = (data: NotificationJobData) =>
  notificationQueue.add('deliver-notification', data);
