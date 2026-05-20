import { rateLimit, type Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { AppError } from '@/common/errors/app-error.js';
import { HTTP_STATUS } from '@/common/constants/http-status.js';
import { getRedisClient } from '@/config/redis.js';
import { env } from '@/config/env.js';

const rateLimitOptions: Partial<Options> = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (_req, _res, next) => {
    next(
      new AppError({
        messageKey: 'errors.rateLimit.exceeded',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        code: 'RATE_LIMITED'
      })
    );
  }
};

if (!env.isTest) {
  rateLimitOptions.store = new RedisStore({
    sendCommand: async (...args: string[]) => getRedisClient().sendCommand(args)
  });
}

export const apiRateLimiter = rateLimit(rateLimitOptions);
