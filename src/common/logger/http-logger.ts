import pinoHttp from 'pino-http';

import { logger } from '@/common/logger/logger.js';
import { env } from '@/config/env.js';

export const httpLogger = pinoHttp({
  logger,
  autoLogging: !env.isTest,
  customProps: (req) => ({
    requestId: (req as { id?: string }).id
  }),
  serializers: {
    req(req) {
      return {
        id: (req as { id?: string }).id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode
      };
    }
  }
});
