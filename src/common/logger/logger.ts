import pino from 'pino';

import { env } from '@/config/env.js';

const loggerOptions: pino.LoggerOptions = {
  name: env.APP_NAME,
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'refreshToken',
      'accessToken'
    ],
    remove: true
  }
};

if (env.isDevelopment) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  };
}

export const logger = pino(loggerOptions);

export type AppLogger = typeof logger;
