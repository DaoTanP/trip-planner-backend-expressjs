import type { RawData, WebSocket } from 'ws';

import { logger } from '@/common/logger/logger.js';
import { duplicateRedisClient } from '@/config/redis.js';
import {
  getCollaborationTripChannel,
  publishCollaborationEvent
} from '@/modules/collaboration/events/collaboration-publisher.js';
import {
  ClientEvents,
  ServerEvents,
  presenceUpdateClientEvents
} from '@/modules/collaboration/events/collaboration-event-registry.js';
import { createCollaborationEnvelope } from '@/modules/collaboration/events/collaboration-envelope.js';
import { createCollaborationErrorEvent } from '@/modules/collaboration/errors/collaboration-error.js';
import {
  CollaborationEventDispatcher,
  type CollaborationHandlerRegistry
} from '@/modules/collaboration/gateway/collaboration-dispatcher.js';
import {
  cursorThrottleMiddleware,
  rateLimitMiddleware,
  runCollaborationMiddleware
} from '@/modules/collaboration/gateway/collaboration-middleware.js';
import {
  ConnectionManager,
  type CollaborationConnection
} from '@/modules/collaboration/gateway/connection-manager.js';
import { collaborationMetrics } from '@/modules/collaboration/observability/collaboration.metrics.js';
import {
  collaborationPresenceService,
  type CollaborationPresenceService
} from '@/modules/collaboration/presence/presence.service.js';
import type {
  ClientPresenceEventType,
  CollaborationClientEvent,
  CollaborationErrorCode,
  CollaborationServerEvent,
  CollaborationUser,
  PresenceProjection,
  TripPresence
} from '@/modules/collaboration/types/collaboration.types.js';
import {
  parseCollaborationClientEvent,
  parseCollaborationPubSubEnvelope
} from '@/modules/collaboration/validators/collaboration-event.validators.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

type ClientPresencePayload = Extract<
  CollaborationClientEvent,
  { type: ClientPresenceEventType }
>['presence'];

export class CollaborationService {
  private readonly subscriber = duplicateRedisClient();
  private readonly connections = new ConnectionManager();
  private readonly subscribedTrips = new Set<string>();
  private readonly dispatcher: CollaborationEventDispatcher;

  constructor(
    private readonly trips: TripsService = tripsService,
    private readonly presence: CollaborationPresenceService = collaborationPresenceService
  ) {
    const handlers = {
      [ClientEvents.TripSubscribe]: async (connection, event) => {
        await this.joinTrip(connection, event.tripId);
      },
      [ClientEvents.TripUnsubscribe]: async (connection, event) => {
        await this.leaveTrip(connection, event.tripId);
      },
      [ClientEvents.ConnectionAck]: (connection, event) => {
        this.connections.acknowledgeEventSequence(connection, event.tripId, event.eventSequence);
        return Promise.resolve();
      },
      [ClientEvents.PresenceLeave]: async (connection, event) => {
        await this.leaveTrip(connection, event.tripId);
      },
      [ClientEvents.PresenceJoin]: async (connection, event) => {
        await this.handlePresenceEvent(connection, event.type, event.presence);
      },
      [ClientEvents.PresenceHeartbeat]: async (connection, event) => {
        await this.handlePresenceEvent(connection, event.type, event.presence);
      },
      [ClientEvents.PresenceFocusChanged]: async (connection, event) => {
        await this.handlePresenceEvent(connection, event.type, event.presence);
      },
      [ClientEvents.PresenceEditStarted]: async (connection, event) => {
        await this.handlePresenceEvent(connection, event.type, event.presence);
      },
      [ClientEvents.PresenceEditStopped]: async (connection, event) => {
        await this.handlePresenceEvent(connection, event.type, event.presence);
      },
      [ClientEvents.PresenceCursorChanged]: async (connection, event) => {
        await this.handlePresenceEvent(connection, event.type, event.presence);
      }
    } satisfies CollaborationHandlerRegistry;

    this.dispatcher = new CollaborationEventDispatcher(handlers);
  }

  async start() {
    if (!this.subscriber.isOpen) {
      await this.subscriber.connect();
    }
  }

  async stop() {
    this.connections.closeAll();

    await Promise.all(
      this.connections.values().map((connection) => this.cleanupConnection(connection))
    );

    for (const tripId of this.subscribedTrips) {
      await this.subscriber.unsubscribe(getCollaborationTripChannel(tripId));
    }
    this.subscribedTrips.clear();

    if (this.subscriber.isOpen) {
      await this.subscriber.quit();
    }
  }

  async acceptConnection(webSocket: WebSocket, user: CollaborationUser, tripId: string) {
    const connection = this.connections.register(webSocket, user);

    webSocket.on('pong', () => {
      this.connections.markAlive(connection);
    });
    webSocket.on('message', (data) => {
      void this.handleMessage(connection, data);
    });
    webSocket.on('close', () => {
      void this.cleanupConnection(connection);
    });
    webSocket.on('error', (error) => {
      collaborationMetrics.increment('websocketErrors');
      logger.warn({ err: error, connectionId: connection.id }, 'Collaboration websocket error');
    });

    await this.joinTrip(connection, tripId);
    await this.sendEvent(connection, {
      type: ServerEvents.ConnectionState,
      state: 'connected',
      tripId
    });

    logger.info(
      { connectionId: connection.id, userId: user.id, tripId },
      'Collaboration connected'
    );
  }

  async checkConnections() {
    const tripIds = this.connections.getTripIds();

    this.connections.pingAll((connection) => {
      void this.cleanupConnection(connection);
      logger.info({ connectionId: connection.id }, 'Terminated stale collaboration connection');
    });

    for (const tripId of tripIds) {
      const removed = await this.presence.pruneStalePresences(tripId);

      for (const presence of removed.presences) {
        await this.publishPresenceLeft(presence, removed.presenceRevision ?? undefined);
      }
    }
  }

  private async handleMessage(connection: CollaborationConnection, data: RawData) {
    this.connections.markMessage(connection);
    const event = parseCollaborationClientEvent(this.parseMessage(data));

    if (!event) {
      collaborationMetrics.increment('validationFailures');
      await this.sendError(connection, 'VALIDATION_ERROR', 'Invalid collaboration event');
      return;
    }

    try {
      const shouldContinue = runCollaborationMiddleware(connection, event, [
        rateLimitMiddleware,
        cursorThrottleMiddleware
      ]);

      if (!shouldContinue) {
        return;
      }

      await this.dispatcher.dispatch(connection, event);
    } catch (error) {
      logger.warn(
        { err: error, connectionId: connection.id, eventType: event.type },
        'Collaboration event rejected'
      );
      await this.sendError(connection, error, this.getClientEventTripId(event));
    }
  }

  private async joinTrip(connection: CollaborationConnection, tripId: string) {
    if (!connection.tripSubscriptions.has(tripId)) {
      const access = await this.trips.getAccessContext(
        connection.user.id,
        tripId,
        connection.user.role
      );

      this.connections.addSubscription(connection, {
        tripId,
        role: String(access.role),
        canEdit: Boolean(access.canEdit)
      });
    } else {
      const subscription = connection.tripSubscriptions.get(tripId);

      if (subscription) {
        this.connections.addSubscription(connection, subscription);
      }
    }

    await this.subscribeTrip(tripId);

    const snapshot = await this.presence.getSnapshot(tripId);
    await this.sendEvent(
      connection,
      {
        type: ServerEvents.PresenceSnapshot,
        tripId,
        presences: snapshot.presences,
        metadata: snapshot.metadata,
        snapshotVersion: snapshot.snapshotVersion,
        presenceRevision: snapshot.presenceRevision,
        generatedAt: snapshot.generatedAt,
        activeUserCount: snapshot.activeUserCount
      },
      {
        presenceRevision: snapshot.presenceRevision,
        snapshotVersion: snapshot.snapshotVersion
      }
    );

    for (const presence of snapshot.presences) {
      await this.sendEvent(
        connection,
        {
          type: ServerEvents.PresenceJoin,
          presence
        },
        {
          presenceRevision: snapshot.presenceRevision
        }
      );
    }

    collaborationMetrics.increment('joins');
    logger.info(
      { connectionId: connection.id, userId: connection.user.id, tripId },
      'Joined collaboration trip'
    );
  }

  private async leaveTrip(connection: CollaborationConnection, tripId: string) {
    const removed = await this.presence.removePresence(tripId, connection.id);

    if (removed.presence) {
      await this.publishPresenceLeft(removed.presence, removed.presenceRevision ?? undefined);
    }

    this.connections.removeSubscription(connection, tripId);

    if (this.connections.isTripEmpty(tripId)) {
      await this.unsubscribeTrip(tripId);
    }

    await this.sendEvent(connection, {
      type: ServerEvents.ConnectionState,
      state: 'disconnected',
      tripId
    });
    collaborationMetrics.increment('leaves');
    logger.info(
      { connectionId: connection.id, userId: connection.user.id, tripId },
      'Left collaboration trip'
    );
  }

  private async handlePresenceEvent(
    connection: CollaborationConnection,
    eventType: ClientPresenceEventType,
    clientPresence: ClientPresencePayload
  ) {
    if (!connection.tripSubscriptions.has(clientPresence.tripId)) {
      await this.joinTrip(connection, clientPresence.tripId);
    }

    const subscription = connection.tripSubscriptions.get(clientPresence.tripId);

    if (!subscription) {
      await this.sendError(connection, 'FORBIDDEN', 'Trip subscription is not active');
      return;
    }

    if (eventType === ClientEvents.PresenceEditStarted && !subscription.canEdit) {
      collaborationMetrics.increment('authorizationFailures');
      await this.sendError(
        connection,
        'FORBIDDEN',
        'Editing presence is not allowed',
        clientPresence.tripId
      );
      return;
    }

    this.connections.setClientIdentity(
      connection,
      clientPresence.tripId,
      clientPresence.clientId,
      clientPresence.deviceId
    );
    await this.cleanupDuplicateConnections(connection, clientPresence);

    const presence = this.toServerPresence(connection, eventType, clientPresence);
    const result = await this.presence.upsertPresence(presence);

    for (const removedDuplicate of result.removedDuplicates) {
      await this.publishPresenceLeft(removedDuplicate, result.presenceRevision);
    }

    await this.publishPresenceUpdated(
      eventType,
      result.presence,
      result.wasPresent,
      result.presenceRevision
    );
    collaborationMetrics.increment('presenceUpdates');

    if (eventType === ClientEvents.PresenceHeartbeat) {
      if (clientPresence.lastSeen) {
        collaborationMetrics.recordHeartbeatLatency(
          Math.max(0, Date.now() - clientPresence.lastSeen)
        );
      }

      await this.sendEvent(connection, {
        type: ServerEvents.HeartbeatAck,
        tripId: presence.tripId,
        timestamp: Date.now()
      });
    }
  }

  private async cleanupDuplicateConnections(
    connection: CollaborationConnection,
    clientPresence: ClientPresencePayload
  ) {
    const duplicates = this.connections.findDuplicateClientConnections(
      clientPresence.tripId,
      clientPresence.clientId,
      clientPresence.deviceId,
      connection.id
    );

    for (const duplicate of duplicates) {
      collaborationMetrics.increment('reconnects');
      duplicate.socket.close(1000, 'Duplicate collaboration connection');
      await this.cleanupConnection(duplicate);
    }
  }

  private toServerPresence(
    connection: CollaborationConnection,
    eventType: ClientPresenceEventType,
    clientPresence: ClientPresencePayload
  ): TripPresence {
    const presence: TripPresence = {
      tripId: clientPresence.tripId,
      userId: connection.user.id,
      name: connection.user.name,
      avatarUrl: connection.user.avatarUrl,
      status: clientPresence.status ?? 'ACTIVE',
      lastSeen: Date.now(),
      deviceId: clientPresence.deviceId,
      clientId: clientPresence.clientId,
      connectionId: connection.id
    };

    if (clientPresence.focusedEntityType && clientPresence.focusedEntityId) {
      presence.focusedEntityType = clientPresence.focusedEntityType;
      presence.focusedEntityId = clientPresence.focusedEntityId;
    }

    if (
      eventType !== ClientEvents.PresenceEditStopped &&
      clientPresence.editingEntityType &&
      clientPresence.editingEntityId
    ) {
      presence.editingEntityType = clientPresence.editingEntityType;
      presence.editingEntityId = clientPresence.editingEntityId;
      presence.editingState = clientPresence.editingState ?? 'EDITING';
      presence.editingStartedAt = Date.now();
    }

    if (clientPresence.cursor !== undefined) {
      presence.cursor = clientPresence.cursor;
    }

    return presence;
  }

  private async publishPresenceUpdated(
    eventType: ClientPresenceEventType,
    presence: PresenceProjection,
    wasPresent: boolean,
    presenceRevision: number
  ) {
    const serverEvent = this.toServerPresenceEvent(eventType, presence, wasPresent);

    await publishCollaborationEvent(presence.tripId, serverEvent, { presenceRevision });

    if (presenceUpdateClientEvents.has(eventType)) {
      await publishCollaborationEvent(
        presence.tripId,
        {
          type: eventType,
          presence
        },
        { presenceRevision }
      );
    }
  }

  private toServerPresenceEvent(
    eventType: ClientPresenceEventType,
    presence: PresenceProjection,
    wasPresent: boolean
  ): CollaborationServerEvent {
    if (eventType === ClientEvents.PresenceJoin && !wasPresent) {
      return {
        type: ServerEvents.PresenceUserJoined,
        presence
      };
    }

    if (eventType === ClientEvents.PresenceFocusChanged) {
      return {
        type: ServerEvents.PresenceFocusUpdated,
        presence
      };
    }

    if (
      eventType === ClientEvents.PresenceEditStarted ||
      eventType === ClientEvents.PresenceEditStopped
    ) {
      return {
        type: ServerEvents.PresenceEditUpdated,
        presence
      };
    }

    return {
      type: ServerEvents.PresenceUserUpdated,
      presence
    };
  }

  private async publishPresenceLeft(presence: TripPresence, presenceRevision: number | undefined) {
    const leftEvent = {
      tripId: presence.tripId,
      clientId: presence.clientId,
      deviceId: presence.deviceId,
      userId: presence.userId
    };

    await publishCollaborationEvent(
      presence.tripId,
      {
        type: ServerEvents.PresenceUserLeft,
        ...leftEvent
      },
      { presenceRevision }
    );
    await publishCollaborationEvent(
      presence.tripId,
      {
        type: ServerEvents.PresenceLeave,
        ...leftEvent
      },
      { presenceRevision }
    );
  }

  private async subscribeTrip(tripId: string) {
    if (this.subscribedTrips.has(tripId)) {
      return;
    }

    const channel = getCollaborationTripChannel(tripId);
    await this.subscriber.subscribe(channel, (message) => {
      this.handlePubSubMessage(tripId, message);
    });
    this.subscribedTrips.add(tripId);
  }

  private async unsubscribeTrip(tripId: string) {
    if (!this.subscribedTrips.has(tripId)) {
      return;
    }

    await this.subscriber.unsubscribe(getCollaborationTripChannel(tripId));
    this.subscribedTrips.delete(tripId);
  }

  private handlePubSubMessage(tripId: string, message: string) {
    const envelope = parseCollaborationPubSubEnvelope(message);

    if (!envelope) {
      return;
    }

    for (const connection of this.connections.getTripConnections(tripId)) {
      if (envelope.targetUserId && envelope.targetUserId !== connection.user.id) {
        continue;
      }

      this.connections.send(connection, envelope.event);
    }
  }

  private async cleanupConnection(connection: CollaborationConnection) {
    if (!this.connections.get(connection.id)) {
      return;
    }

    const tripIds = Array.from(connection.tripSubscriptions.keys());

    for (const tripId of tripIds) {
      const removed = await this.presence.removePresence(tripId, connection.id);

      if (removed.presence) {
        await this.publishPresenceLeft(removed.presence, removed.presenceRevision ?? undefined);
      }

      this.connections.removeSubscription(connection, tripId);

      if (this.connections.isTripEmpty(tripId)) {
        await this.unsubscribeTrip(tripId);
      }
    }

    this.connections.unregister(connection.id);
    logger.info(
      { connectionId: connection.id, userId: connection.user.id },
      'Collaboration disconnected'
    );
  }

  private async sendEvent(
    connection: CollaborationConnection,
    event: CollaborationServerEvent,
    options: {
      presenceRevision?: number | undefined;
      snapshotVersion?: number;
    } = {}
  ) {
    const envelope = await createCollaborationEnvelope(event, options);
    this.connections.send(connection, envelope);
  }

  private async sendError(
    connection: CollaborationConnection,
    error: unknown,
    messageOrTripId?: string,
    tripId?: string
  ) {
    const event: CollaborationServerEvent =
      typeof error === 'string'
        ? {
            type: ServerEvents.CollaborationError,
            ...(tripId ? { tripId } : {}),
            error: {
              code: error as CollaborationErrorCode,
              message: messageOrTripId ?? error
            }
          }
        : createCollaborationErrorEvent(error, messageOrTripId);

    await this.sendEvent(connection, event);
  }

  private parseMessage(data: RawData) {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data) as unknown;
      }

      if (Array.isArray(data)) {
        return JSON.parse(Buffer.concat(data).toString('utf8')) as unknown;
      }

      if (data instanceof ArrayBuffer) {
        return JSON.parse(Buffer.from(new Uint8Array(data)).toString('utf8')) as unknown;
      }

      return JSON.parse(Buffer.from(data).toString('utf8')) as unknown;
    } catch {
      return null;
    }
  }

  private getClientEventTripId(event: CollaborationClientEvent) {
    if ('presence' in event) {
      return event.presence.tripId;
    }

    return event.tripId;
  }
}

export const collaborationService = new CollaborationService();
