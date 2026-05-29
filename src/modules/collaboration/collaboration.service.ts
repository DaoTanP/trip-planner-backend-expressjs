import type { NoteTargetEntityType, UserRole } from '@prisma/client';

import { AuthorizationError } from '@/common/errors/authorization-error.js';
import { ConflictError } from '@/common/errors/conflict-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import {
  collaborationRepository,
  type CollaborationRepository
} from '@/modules/collaboration/collaboration.repository.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

export type CollaborationActor = {
  id: string;
  role: UserRole;
};

export type ResolvedCollaborationTarget = {
  tripId: string;
  targetEntityType: NoteTargetEntityType;
  targetEntityId: string;
};

export type NotePermissionTarget = {
  tripId: string | null;
  authorId: string | null;
};

export class CollaborationService {
  constructor(
    private readonly repository: CollaborationRepository = collaborationRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async resolveWritableTarget(
    actor: CollaborationActor,
    targetEntityType: NoteTargetEntityType,
    targetEntityId: string,
    tripId?: string
  ): Promise<ResolvedCollaborationTarget> {
    const registered = await this.repository.findEntity(targetEntityType, targetEntityId);
    if (!registered) {
      throw new NotFoundError({ resourceKey: 'resources.resource' });
    }

    const resolvedTripId =
      registered.tripId ?? (targetEntityType === 'TRIP' ? targetEntityId : tripId);
    if (!resolvedTripId) {
      throw new ConflictError('A trip scope is required for this collaboration target');
    }

    await this.trips.ensureCanAccessTrip(actor.id, resolvedTripId, actor.role);

    return {
      tripId: resolvedTripId,
      targetEntityType,
      targetEntityId
    };
  }

  async ensureCanManageNote(actor: CollaborationActor, note: NotePermissionTarget): Promise<void> {
    if (note.authorId === actor.id) {
      if (note.tripId) {
        await this.trips.ensureCanAccessTrip(actor.id, note.tripId, actor.role);
      }

      return;
    }

    if (!note.tripId) {
      if (actor.role === 'ADMIN') {
        return;
      }

      throw new AuthorizationError();
    }

    const access = await this.trips.getAccessContext(actor.id, note.tripId, actor.role);
    if (!access.canModerate) {
      throw new AuthorizationError();
    }
  }
}

export const collaborationService = new CollaborationService();
