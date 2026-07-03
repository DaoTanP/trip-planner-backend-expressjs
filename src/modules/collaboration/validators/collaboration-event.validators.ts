import { z } from 'zod';

import { ClientEvents } from '@/modules/collaboration/events/collaboration-event-registry.js';
import { presenceEntityTypes } from '@/modules/collaboration/types/collaboration.types.js';
import type {
  CollaborationClientEvent,
  CollaborationPubSubEnvelope
} from '@/modules/collaboration/types/collaboration.types.js';

const presenceEntityTypeSchema = z.enum(presenceEntityTypes);

const presenceCursorSchema = z.object({
  x: z.number(),
  y: z.number(),
  entityType: presenceEntityTypeSchema.optional(),
  entityId: z.string().min(1).max(200).optional()
});

const clientPresenceSchema = z
  .object({
    tripId: z.string().min(1).max(120),
    userId: z.string().min(1).max(120).optional(),
    name: z.string().min(1).max(180).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    status: z.enum(['ACTIVE', 'IDLE', 'OFFLINE']).default('ACTIVE'),
    focusedEntityType: presenceEntityTypeSchema.optional(),
    focusedEntityId: z.string().min(1).max(200).optional(),
    editingEntityType: presenceEntityTypeSchema.optional(),
    editingEntityId: z.string().min(1).max(200).optional(),
    editingState: z.enum(['EDITING', 'REPLYING']).optional(),
    cursor: presenceCursorSchema.nullable().optional(),
    lastSeen: z.number().optional(),
    deviceId: z.string().min(1).max(200),
    clientId: z.string().min(1).max(200)
  })
  .passthrough();

export const collaborationClientEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(ClientEvents.PresenceJoin),
    presence: clientPresenceSchema
  }),
  z.object({
    type: z.literal(ClientEvents.PresenceHeartbeat),
    presence: clientPresenceSchema
  }),
  z.object({
    type: z.literal(ClientEvents.PresenceFocusChanged),
    presence: clientPresenceSchema
  }),
  z.object({
    type: z.literal(ClientEvents.PresenceEditStarted),
    presence: clientPresenceSchema
  }),
  z.object({
    type: z.literal(ClientEvents.PresenceEditStopped),
    presence: clientPresenceSchema
  }),
  z.object({
    type: z.literal(ClientEvents.PresenceCursorChanged),
    presence: clientPresenceSchema
  }),
  z.object({
    type: z.literal(ClientEvents.PresenceLeave),
    tripId: z.string().min(1).max(120),
    clientId: z.string().min(1).max(200).optional(),
    deviceId: z.string().min(1).max(200).optional()
  }),
  z.object({
    type: z.literal(ClientEvents.TripSubscribe),
    tripId: z.string().min(1).max(120)
  }),
  z.object({
    type: z.literal(ClientEvents.TripUnsubscribe),
    tripId: z.string().min(1).max(120)
  }),
  z.object({
    type: z.literal(ClientEvents.ConnectionAck),
    tripId: z.string().min(1).max(120),
    eventSequence: z.number().int().nonnegative()
  })
]);

export function parseCollaborationClientEvent(value: unknown): CollaborationClientEvent | null {
  const result = collaborationClientEventSchema.safeParse(unwrapClientEnvelope(value));

  return result.success ? result.data : null;
}

export function parseCollaborationPubSubEnvelope(
  value: string
): CollaborationPubSubEnvelope | null {
  try {
    const parsed = JSON.parse(value) as CollaborationPubSubEnvelope;

    if (!parsed || typeof parsed !== 'object' || !parsed.event || !parsed.publishedAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function unwrapClientEnvelope(value: unknown) {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const candidate = value as {
    eventType?: unknown;
    type?: unknown;
    payload?: unknown;
  };

  if (
    typeof candidate.eventType !== 'string' ||
    !candidate.payload ||
    typeof candidate.payload !== 'object'
  ) {
    return value;
  }

  return {
    type: candidate.eventType,
    ...(candidate.payload as Record<string, unknown>)
  };
}
