import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';

import { WebSocketServer } from 'ws';

import { logger } from '@/common/logger/logger.js';
import { env } from '@/config/env.js';
import { collaborationConfig } from '@/modules/collaboration/config/collaboration.config.js';
import { collaborationMetrics } from '@/modules/collaboration/observability/collaboration.metrics.js';
import { collaborationAuthService } from '@/modules/collaboration/services/collaboration-auth.service.js';
import { collaborationService } from '@/modules/collaboration/services/collaboration.service.js';
import type { CollaborationService } from '@/modules/collaboration/services/collaboration.service.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

export class CollaborationGateway {
  private readonly webSocketServer = new WebSocketServer({ noServer: true });
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private started = false;

  constructor(
    private readonly server: HttpServer,
    private readonly trips: TripsService = tripsService,
    private readonly collaboration: CollaborationService = collaborationService
  ) {}

  async start() {
    if (!collaborationConfig.enabled) {
      logger.info('Collaboration websocket gateway disabled');
      return;
    }

    if (this.started) {
      return;
    }

    await this.collaboration.start();
    this.server.on('upgrade', this.handleUpgrade);
    this.heartbeatTimer = setInterval(
      () => void this.collaboration.checkConnections(),
      collaborationConfig.heartbeatIntervalMs
    );
    this.started = true;

    logger.info(
      {
        path: collaborationConfig.websocketPath,
        heartbeatIntervalMs: collaborationConfig.heartbeatIntervalMs,
        presenceTtlMs: collaborationConfig.presenceTtlMs
      },
      'Collaboration websocket gateway started'
    );
  }

  async stop() {
    if (!this.started) {
      return;
    }

    this.server.off('upgrade', this.handleUpgrade);

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    await this.collaboration.stop();

    await new Promise<void>((resolve, reject) => {
      this.webSocketServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    this.started = false;
    logger.info('Collaboration websocket gateway stopped');
  }

  private readonly handleUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    void this.handleUpgradeRequest(request, socket, head);
  };

  private async handleUpgradeRequest(request: IncomingMessage, socket: Duplex, head: Buffer) {
    const url = new URL(request.url ?? '/', 'http://localhost');

    if (url.pathname !== collaborationConfig.websocketPath) {
      this.rejectUpgrade(socket, 404, 'Not Found');
      return;
    }

    if (!this.isOriginAllowed(request.headers.origin)) {
      logger.warn({ origin: request.headers.origin }, 'Rejected collaboration websocket origin');
      this.rejectUpgrade(socket, 403, 'Forbidden');
      return;
    }

    const tripId = url.searchParams.get('tripId');

    if (!tripId) {
      this.rejectUpgrade(socket, 400, 'Missing tripId');
      return;
    }

    try {
      const user = await collaborationAuthService.authenticateRequest(request, url);
      await this.trips.ensureCanAccessTrip(user.id, tripId, user.role);

      this.webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        void this.collaboration.acceptConnection(webSocket, user, tripId);
      });
    } catch (error) {
      collaborationMetrics.increment('authFailures');
      logger.warn({ err: error, tripId }, 'Rejected collaboration websocket authentication');
      this.rejectUpgrade(socket, 401, 'Unauthorized');
    }
  }

  private isOriginAllowed(origin: string | undefined) {
    return !origin || env.CORS_ORIGINS.includes('*') || env.CORS_ORIGINS.includes(origin);
  }

  private rejectUpgrade(socket: Duplex, statusCode: number, message: string) {
    socket.write(`HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
  }
}

export function createCollaborationGateway(server: HttpServer) {
  return new CollaborationGateway(server);
}
