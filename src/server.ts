import http from 'node:http';

import { logger } from '@/common/logger/logger.js';
import { env } from '@/config/env.js';
import { connectRedis, disconnectRedis } from '@/config/redis.js';
import { createApp } from '@/app.js';
import { createCollaborationGateway } from '@/modules/collaboration/gateway/collaboration.gateway.js';
import { disconnectPrisma } from '@/prisma/client.js';

const app = createApp();
const server = http.createServer(app);
const collaborationGateway = createCollaborationGateway(server);

const start = async () => {
  await connectRedis();
  await collaborationGateway.start();

  server.listen(env.APP_PORT, () => {
    logger.info(
      {
        port: env.APP_PORT,
        environment: env.NODE_ENV,
        apiPrefix: env.API_PREFIX
      },
      'HTTP server started'
    );
  });
};

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, 'HTTP server shutdown requested');

  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'HTTP server closed with error');
      process.exit(1);
    }

    void (async () => {
      await collaborationGateway.stop();
      await disconnectRedis();
      await disconnectPrisma();
      logger.info('HTTP server stopped');
      process.exit(0);
    })();
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start HTTP server');
  process.exit(1);
});
