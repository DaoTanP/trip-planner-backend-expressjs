import { rateLimit, type Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { getRedisClient } from '@/config/redis.js';
import { env } from '@/config/env.js';

const rateLimitOptions: Partial<Options> = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests'
    }
  }
};

if (!env.isTest) {
  rateLimitOptions.store = new RedisStore({
    sendCommand: async (...args: string[]) => getRedisClient().sendCommand(args)
  });
}

export const apiRateLimiter = rateLimit(rateLimitOptions);
