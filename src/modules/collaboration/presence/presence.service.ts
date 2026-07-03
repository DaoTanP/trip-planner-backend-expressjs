import { logger } from '@/common/logger/logger.js';
import {
  projectPresence,
  projectPresences
} from '@/modules/collaboration/presence/presence.projection.js';
import {
  redisPresenceRepository,
  type PresenceRepository
} from '@/modules/collaboration/presence/presence.repository.js';
import type {
  PresenceProjection,
  PresenceSnapshot,
  TripPresence
} from '@/modules/collaboration/types/collaboration.types.js';

export type UpsertPresenceResult = {
  wasPresent: boolean;
  presence: PresenceProjection;
  removedDuplicates: TripPresence[];
  presenceRevision: number;
};

export type RemovePresenceResult = {
  presence: TripPresence | null;
  presenceRevision: number | null;
};

export type PruneStalePresenceResult = {
  presences: TripPresence[];
  presenceRevision: number | null;
};

export class CollaborationPresenceService {
  constructor(private readonly repository: PresenceRepository = redisPresenceRepository) {}

  async getSnapshot(tripId: string): Promise<PresenceSnapshot> {
    const removed = await this.pruneStalePresences(tripId);

    if (removed.presences.length > 0) {
      logger.info(
        { tripId, count: removed.presences.length },
        'Pruned stale collaboration presence'
      );
    }

    const rawPresences = await this.repository.getSnapshot(tripId);
    const presenceRevision = await this.repository.getPresenceRevision(tripId);
    const generatedAt = new Date().toISOString();
    const presences = projectPresences(rawPresences);
    const metadata = {
      snapshotVersion: presenceRevision,
      presenceRevision,
      generatedAt,
      activeUserCount: new Set(presences.map((presence) => presence.userId)).size
    };

    return {
      tripId,
      presences,
      ...metadata,
      metadata
    };
  }

  async upsertPresence(presence: TripPresence): Promise<UpsertPresenceResult> {
    const result = await this.repository.upsertPresence(presence);
    const presenceRevision = await this.repository.nextPresenceRevision(presence.tripId);
    const rawPresences = await this.repository.getSnapshot(presence.tripId);

    return {
      wasPresent: result.wasPresent,
      presence: projectPresence(presence, rawPresences),
      removedDuplicates: result.removedDuplicates,
      presenceRevision
    };
  }

  async removePresence(tripId: string, connectionId: string): Promise<RemovePresenceResult> {
    const presence = await this.repository.removePresence(tripId, connectionId);

    if (!presence) {
      return {
        presence: null,
        presenceRevision: null
      };
    }

    return {
      presence,
      presenceRevision: await this.repository.nextPresenceRevision(tripId)
    };
  }

  async pruneStalePresences(tripId: string): Promise<PruneStalePresenceResult> {
    const presences = await this.repository.pruneStalePresences(tripId);

    if (presences.length === 0) {
      return {
        presences,
        presenceRevision: null
      };
    }

    return {
      presences,
      presenceRevision: await this.repository.nextPresenceRevision(tripId)
    };
  }
}

export const collaborationPresenceService = new CollaborationPresenceService();
