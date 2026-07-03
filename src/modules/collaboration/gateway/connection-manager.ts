import { randomUUID } from 'node:crypto';

import { WebSocket } from 'ws';

import { websocketCloseCodes } from '@/modules/collaboration/events/collaboration-event-registry.js';
import { CollaborationRateLimiter } from '@/modules/collaboration/gateway/collaboration-rate-limiter.js';
import { collaborationMetrics } from '@/modules/collaboration/observability/collaboration.metrics.js';
import type {
  CollaborationServerEnvelope,
  CollaborationUser,
  TripSubscription
} from '@/modules/collaboration/types/collaboration.types.js';

export type CollaborationConnection = {
  id: string;
  socket: WebSocket;
  user: CollaborationUser;
  tripSubscriptions: Map<string, TripSubscription>;
  rateLimiter: CollaborationRateLimiter;
  isAlive: boolean;
  connectedAt: number;
  lastMessageAt: number;
  lastHeartbeatAt: number;
  cursorPublishedAtByTripId: Map<string, number>;
  clientIdentityByTripId: Map<string, { clientId: string; deviceId: string }>;
  ackedEventSequenceByTripId: Map<string, number>;
};

export class ConnectionManager {
  private readonly connections = new Map<string, CollaborationConnection>();
  private readonly tripConnections = new Map<string, Set<string>>();

  register(socket: WebSocket, user: CollaborationUser) {
    const connection: CollaborationConnection = {
      id: randomUUID(),
      socket,
      user,
      tripSubscriptions: new Map(),
      rateLimiter: new CollaborationRateLimiter(),
      isAlive: true,
      connectedAt: Date.now(),
      lastMessageAt: Date.now(),
      lastHeartbeatAt: Date.now(),
      cursorPublishedAtByTripId: new Map(),
      clientIdentityByTripId: new Map(),
      ackedEventSequenceByTripId: new Map()
    };

    this.connections.set(connection.id, connection);
    this.updateConnectionMetric();

    return connection;
  }

  unregister(connectionId: string) {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return null;
    }

    for (const tripId of connection.tripSubscriptions.keys()) {
      this.removeFromTrip(connectionId, tripId);
    }

    this.connections.delete(connectionId);
    this.updateConnectionMetric();

    return connection;
  }

  get(connectionId: string) {
    return this.connections.get(connectionId) ?? null;
  }

  values() {
    return Array.from(this.connections.values());
  }

  markMessage(connection: CollaborationConnection) {
    connection.lastMessageAt = Date.now();
  }

  markAlive(connection: CollaborationConnection) {
    connection.isAlive = true;
    connection.lastHeartbeatAt = Date.now();
  }

  setClientIdentity(
    connection: CollaborationConnection,
    tripId: string,
    clientId: string,
    deviceId: string
  ) {
    connection.clientIdentityByTripId.set(tripId, { clientId, deviceId });
  }

  acknowledgeEventSequence(
    connection: CollaborationConnection,
    tripId: string,
    eventSequence: number
  ) {
    const current = connection.ackedEventSequenceByTripId.get(tripId) ?? 0;
    connection.ackedEventSequenceByTripId.set(tripId, Math.max(current, eventSequence));
  }

  addSubscription(connection: CollaborationConnection, subscription: TripSubscription) {
    connection.tripSubscriptions.set(subscription.tripId, subscription);

    let room = this.tripConnections.get(subscription.tripId);

    if (!room) {
      room = new Set();
      this.tripConnections.set(subscription.tripId, room);
    }

    room.add(connection.id);
    this.updateRoomMetric();
  }

  removeSubscription(connection: CollaborationConnection, tripId: string) {
    connection.tripSubscriptions.delete(tripId);
    this.removeFromTrip(connection.id, tripId);
    this.updateRoomMetric();
  }

  getTripConnectionIds(tripId: string) {
    return Array.from(this.tripConnections.get(tripId) ?? []);
  }

  getTripConnections(tripId: string) {
    return this.getTripConnectionIds(tripId)
      .map((connectionId) => this.connections.get(connectionId) ?? null)
      .filter((connection): connection is CollaborationConnection => connection !== null);
  }

  findDuplicateClientConnections(
    tripId: string,
    clientId: string,
    deviceId: string,
    excludeConnectionId: string
  ) {
    return this.getTripConnections(tripId).filter((connection) => {
      if (connection.id === excludeConnectionId) {
        return false;
      }

      const identity = connection.clientIdentityByTripId.get(tripId);

      return identity?.clientId === clientId && identity.deviceId === deviceId;
    });
  }

  getTripIds() {
    return Array.from(this.tripConnections.keys());
  }

  isTripEmpty(tripId: string) {
    return !this.tripConnections.has(tripId);
  }

  send(
    connection: CollaborationConnection,
    event: CollaborationServerEnvelope | Record<string, unknown>
  ) {
    if (connection.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    connection.socket.send(JSON.stringify(event));
  }

  closeAll() {
    for (const connection of this.connections.values()) {
      connection.socket.close(websocketCloseCodes.restart, 'Server shutting down');
    }
  }

  pingAll(onStale: (connection: CollaborationConnection) => void) {
    for (const connection of this.connections.values()) {
      if (!connection.isAlive) {
        collaborationMetrics.increment('heartbeatTimeouts');
        connection.socket.terminate();
        onStale(connection);
        continue;
      }

      connection.isAlive = false;
      connection.socket.ping();
    }
  }

  activeUserCount() {
    return new Set(Array.from(this.connections.values()).map((connection) => connection.user.id))
      .size;
  }

  updateActiveUserMetric() {
    collaborationMetrics.setGauge('activeUsers', this.activeUserCount());
  }

  private removeFromTrip(connectionId: string, tripId: string) {
    const room = this.tripConnections.get(tripId);
    room?.delete(connectionId);

    if (room && room.size === 0) {
      this.tripConnections.delete(tripId);
    }
  }

  private updateConnectionMetric() {
    collaborationMetrics.setGauge('activeConnections', this.connections.size);
    this.updateActiveUserMetric();
    this.updateRoomMetric();
  }

  private updateRoomMetric() {
    collaborationMetrics.setGauge('activeRooms', this.tripConnections.size);
  }
}
