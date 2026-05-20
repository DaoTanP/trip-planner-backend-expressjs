import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';

import { apiRateLimiter } from '@/common/middleware/rate-limit.middleware.js';
import { errorHandler } from '@/common/middleware/error-handler.middleware.js';
import { localeMiddleware } from '@/common/middleware/locale.middleware.js';
import { notFoundHandler } from '@/common/middleware/not-found.middleware.js';
import { requestIdMiddleware } from '@/common/middleware/request-id.middleware.js';
import { httpLogger } from '@/common/logger/http-logger.js';
import { sendSuccess } from '@/common/utils/response.js';
import { env } from '@/config/env.js';
import { csrfProtection } from '@/modules/auth/auth.csrf.middleware.js';
import { apiRouter } from '@/routes.js';

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin || env.CORS_ORIGINS.includes('*') || env.CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by CORS'));
  }
};

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);
  app.use(localeMiddleware);
  app.use(httpLogger);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(csrfProtection);
  app.use(apiRateLimiter);

  app.get('/health', (_req, res) =>
    sendSuccess(res, {
      status: 'ok',
      app: env.APP_NAME,
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    })
  );

  app.use(env.API_PREFIX, apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
