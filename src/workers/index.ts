import { Worker } from 'bullmq';

import { logger } from '@/common/logger/logger.js';
import { queueConnection } from '@/config/queue.js';
import { QUEUE_NAMES } from '@/jobs/queue-names.js';
import type { NotificationJobData } from '@/jobs/notification.queue.js';
import { disconnectPrisma } from '@/prisma/client.js';

const notificationWorker = new Worker<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing notification delivery job');
    return { delivered: true };
  },
  {
    connection: queueConnection,
    concurrency: 5
  }
);

notificationWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, err: error }, 'Notification job failed');
});

notificationWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Notification job completed');
});

const shutdown = async (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'Worker shutdown requested');
  await notificationWorker.close();
  await queueConnection.quit();
  await disconnectPrisma();
  process.exit(0);
};

process.on('SIGINT', (signal) => {
  void shutdown(signal);
});
process.on('SIGTERM', (signal) => {
  void shutdown(signal);
});
