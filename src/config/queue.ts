import IORedis from 'ioredis';
import type { JobsOptions, QueueOptions } from 'bullmq';

import { env } from '@/config/env.js';

export const queueConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  },
  removeOnComplete: {
    age: 60 * 60 * 24,
    count: 1000
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 7
  }
};

export const queueOptions: QueueOptions = {
  connection: queueConnection,
  defaultJobOptions
};
