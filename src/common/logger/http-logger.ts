import type { Request, Response, RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from '@/common/logger/logger.js';
import { env } from '@/config/env.js';

type LoggedRequest = Request & { id?: string };

export const httpLogger = pinoHttp({
  logger,
  autoLogging: !env.isTest,
  customProps: (req: LoggedRequest) => ({
    requestId: req.id
  }),
  serializers: {
    req(req: LoggedRequest) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress:
          req.ip ||
          req.socket?.remoteAddress ||
          'unknown'
      };
    },

    res(res: Response) {
      return {
        statusCode: res.statusCode
      };
    }
  }
}) as RequestHandler;