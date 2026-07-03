import { collaborationConfig } from '@/modules/collaboration/config/collaboration.config.js';
import { CollaborationError } from '@/modules/collaboration/errors/collaboration-error.js';
import { ClientEvents } from '@/modules/collaboration/events/collaboration-event-registry.js';
import type { CollaborationConnection } from '@/modules/collaboration/gateway/connection-manager.js';
import { collaborationMetrics } from '@/modules/collaboration/observability/collaboration.metrics.js';
import type { CollaborationClientEvent } from '@/modules/collaboration/types/collaboration.types.js';

export type CollaborationMiddleware = (
  connection: CollaborationConnection,
  event: CollaborationClientEvent
) => boolean;

function getEventTripId(event: CollaborationClientEvent) {
  if ('presence' in event) {
    return event.presence.tripId;
  }

  return event.tripId;
}

export function rateLimitMiddleware(
  connection: CollaborationConnection,
  event: CollaborationClientEvent
) {
  if (connection.rateLimiter.consume(event.type)) {
    return true;
  }

  collaborationMetrics.increment('rateLimited');
  throw new CollaborationError('RATE_LIMITED', 'Too many collaboration events');
}

export function cursorThrottleMiddleware(
  connection: CollaborationConnection,
  event: CollaborationClientEvent
) {
  if (event.type !== ClientEvents.PresenceCursorChanged) {
    return true;
  }

  const tripId = getEventTripId(event);
  const now = Date.now();
  const lastPublishedAt = connection.cursorPublishedAtByTripId.get(tripId) ?? 0;

  if (now - lastPublishedAt < collaborationConfig.cursorThrottleMs) {
    collaborationMetrics.increment('cursorDropped');
    return false;
  }

  connection.cursorPublishedAtByTripId.set(tripId, now);

  return true;
}

export function runCollaborationMiddleware(
  connection: CollaborationConnection,
  event: CollaborationClientEvent,
  middleware: readonly CollaborationMiddleware[]
) {
  for (const item of middleware) {
    if (!item(connection, event)) {
      return false;
    }
  }

  return true;
}
