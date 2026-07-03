import { logger } from '@/common/logger/logger.js';
import { getRedisClient } from '@/config/redis.js';
import { collaborationConfig } from '@/modules/collaboration/config/collaboration.config.js';
import { createCollaborationEnvelope } from '@/modules/collaboration/events/collaboration-envelope.js';
import { collaborationMetrics } from '@/modules/collaboration/observability/collaboration.metrics.js';
import type {
  CollaborationPubSubEnvelope,
  CollaborationServerEvent,
  PlanningInvalidatedEvent,
  RevisionConflictEvent,
  TripUpdatedEvent
} from '@/modules/collaboration/types/collaboration.types.js';

export function getCollaborationTripChannel(tripId: string) {
  return `${collaborationConfig.redisPrefix}:trip:events:${tripId}`;
}

export async function publishCollaborationEvent(
  tripId: string,
  event: CollaborationServerEvent,
  options: {
    targetUserId?: string | undefined;
    presenceRevision?: number | undefined;
    snapshotVersion?: number | undefined;
  } = {}
) {
  if (!collaborationConfig.enabled) {
    return;
  }

  try {
    const envelope: CollaborationPubSubEnvelope = {
      event: await createCollaborationEnvelope(event, {
        tripId,
        presenceRevision: options.presenceRevision,
        snapshotVersion: options.snapshotVersion
      }),
      publishedAt: new Date().toISOString()
    };

    if (options.targetUserId !== undefined) {
      envelope.targetUserId = options.targetUserId;
    }

    await getRedisClient().publish(getCollaborationTripChannel(tripId), JSON.stringify(envelope));
  } catch (error) {
    collaborationMetrics.increment('redisFailures');
    logger.error({ err: error, tripId, eventType: event.type }, 'Collaboration publish failed');
  }
}

export function scheduleTripUpdatedBroadcast(input: Omit<TripUpdatedEvent, 'type' | 'timestamp'>) {
  if (!collaborationConfig.enabled) {
    return;
  }

  collaborationMetrics.increment('tripUpdates');
  setImmediate(() => {
    void publishCollaborationEvent(input.tripId, {
      type: 'trip.updated',
      ...input,
      timestamp: new Date().toISOString()
    });
  });
}

export function schedulePlanningInvalidatedBroadcast(
  input: Omit<PlanningInvalidatedEvent, 'type' | 'timestamp'>
) {
  if (!collaborationConfig.enabled) {
    return;
  }

  collaborationMetrics.increment('planningInvalidations');
  setImmediate(() => {
    void publishCollaborationEvent(input.tripId, {
      type: 'planning.invalidated',
      ...input,
      timestamp: new Date().toISOString()
    });
  });
}

export function publishRevisionConflict(
  input: Omit<RevisionConflictEvent, 'type' | 'timestamp'> & { userId: string }
) {
  if (!collaborationConfig.enabled) {
    return;
  }

  const { userId, ...eventInput } = input;
  collaborationMetrics.increment('revisionConflicts');

  void publishCollaborationEvent(
    eventInput.tripId,
    {
      type: 'revision.conflict',
      ...eventInput,
      timestamp: new Date().toISOString()
    },
    { targetUserId: userId }
  );
}
