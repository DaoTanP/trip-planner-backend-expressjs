import { randomUUID } from 'node:crypto';

import { getRedisClient } from '@/config/redis.js';
import { collaborationConfig } from '@/modules/collaboration/config/collaboration.config.js';
import type {
  CollaborationServerEnvelope,
  CollaborationServerEvent
} from '@/modules/collaboration/types/collaboration.types.js';

function eventSequenceKey(tripId: string) {
  return `${collaborationConfig.redisPrefix}:trip:event-sequence:${tripId}`;
}

function getEventTripId(event: CollaborationServerEvent) {
  if ('tripId' in event && typeof event.tripId === 'string') {
    return event.tripId;
  }

  if ('presence' in event) {
    return event.presence.tripId;
  }

  return undefined;
}

function getEventUserId(event: CollaborationServerEvent) {
  if ('presence' in event) {
    return event.presence.userId;
  }

  if ('userId' in event && typeof event.userId === 'string') {
    return event.userId;
  }

  return undefined;
}

function toPayload(event: CollaborationServerEvent): Record<string, unknown> {
  const { type: _type, ...payload } = event;

  return payload;
}

export async function nextCollaborationEventSequence(tripId: string) {
  return getRedisClient().incr(eventSequenceKey(tripId));
}

export async function createCollaborationEnvelope(
  event: CollaborationServerEvent,
  options: {
    tripId?: string | undefined;
    presenceRevision?: number | undefined;
    snapshotVersion?: number | undefined;
  } = {}
): Promise<CollaborationServerEnvelope & Record<string, unknown>> {
  const tripId = options.tripId ?? getEventTripId(event);
  const generatedAt = new Date().toISOString();
  const payload = toPayload(event);
  const sequence = tripId ? await nextCollaborationEventSequence(tripId) : 0;
  const envelope: CollaborationServerEnvelope<Record<string, unknown>> = {
    id: randomUUID(),
    timestamp: generatedAt,
    generatedAt,
    eventType: event.type,
    type: event.type,
    eventSequence: sequence,
    payload
  };

  if (tripId) {
    envelope.tripId = tripId;
  }

  const userId = getEventUserId(event);

  if (userId) {
    envelope.userId = userId;
  }

  if (options.presenceRevision !== undefined) {
    envelope.presenceRevision = options.presenceRevision;
  }

  if (options.snapshotVersion !== undefined) {
    envelope.snapshotVersion = options.snapshotVersion;
  }

  return {
    ...payload,
    ...envelope
  };
}
