import { collaborationConfig } from '@/modules/collaboration/config/collaboration.config.js';
import { ClientEvents } from '@/modules/collaboration/events/collaboration-event-registry.js';
import type { CollaborationClientEvent } from '@/modules/collaboration/types/collaboration.types.js';

type Bucket = {
  count: number;
  resetAt: number;
};

export class CollaborationRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  consume(eventType: CollaborationClientEvent['type']) {
    const bucketName = this.getBucketName(eventType);
    const now = Date.now();
    const current = this.buckets.get(bucketName);

    if (!current || current.resetAt <= now) {
      this.buckets.set(bucketName, {
        count: 1,
        resetAt: now + collaborationConfig.rateLimitWindowMs
      });
      return true;
    }

    current.count += 1;

    return current.count <= this.getLimit(bucketName);
  }

  private getBucketName(eventType: CollaborationClientEvent['type']) {
    if (eventType === ClientEvents.PresenceHeartbeat) {
      return 'heartbeat';
    }

    if (
      eventType === ClientEvents.TripSubscribe ||
      eventType === ClientEvents.TripUnsubscribe ||
      eventType === ClientEvents.ConnectionAck
    ) {
      return 'subscription';
    }

    return 'presence';
  }

  private getLimit(bucketName: string) {
    if (bucketName === 'heartbeat') {
      return collaborationConfig.rateLimits.heartbeat;
    }

    if (bucketName === 'subscription') {
      return collaborationConfig.rateLimits.subscription;
    }

    return collaborationConfig.rateLimits.presence;
  }
}
