import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from '@/common/logger/logger.js';
import { env } from '@/config/env.js';

type LoggedRequest = IncomingMessage & { id?: string };

export const httpLogger = pinoHttp<LoggedRequest, ServerResponse>({
  logger,
  autoLogging: !env.isTest,
  customProps: (req) => ({
    requestId: req.id
  }),
  serializers: {
    req(req: LoggedRequest) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.socket.remoteAddress
      };
    },
    res(res: ServerResponse) {
      return {
        statusCode: res.statusCode
      };
    }
  }
}) as unknown as RequestHandler;
