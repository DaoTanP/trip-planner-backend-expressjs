import type { Prisma } from '@prisma/client';

import { ConflictError } from '@/common/errors/conflict-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { normalizeCursorLimit } from '@/common/utils/cursor-pagination.js';
import {
  itineraryRepository,
  type ItineraryRepository
} from '@/modules/itinerary/itinerary.repository.js';
import type {
  CreateItineraryItemInput,
  DeleteItineraryItemQuery,
  ListItineraryQuery,
  ReorderItineraryItemsInput,
  UpdateItineraryItemInput
} from '@/modules/itinerary/itinerary.schemas.js';
import { ensureIdempotentMutation } from '@/modules/sync/idempotency.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

export class ItineraryService {
  constructor(
    private readonly repository: ItineraryRepository = itineraryRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async listItems(userId: string, tripId: string, query: ListItineraryQuery) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    return this.repository.listItems(tripId, {
      cursor: query.cursor,
      limit: normalizeCursorLimit(query.limit)
    });
  }

  async listPlacesForTrip(userId: string, tripId: string) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    return this.repository.listPlacesForTrip(tripId);
  }

  async createItineraryItem(userId: string, tripId: string, input: CreateItineraryItemInput) {
    await this.trips.ensureCanEditTrip(userId, tripId);
    const replay = await ensureIdempotentMutation(
      tripId,
      input.clientMutationId,
      async (mutation) => {
        if (!mutation.entityId) return null;

        const item = await this.repository.findItineraryItemById(mutation.entityId);
        return item ? { item, revision: mutation.revision } : null;
      }
    );

    if (replay) {
      return replay;
    }

    await this.trips.ensureExpectedRevision(tripId, input.expectedRevision, undefined, {
      actorId: userId,
      entityType: 'ITINERARY_ITEM',
      operation: 'ENTITY_CREATED',
      localPayload: input as Record<string, unknown>
    });

    const result = await this.repository.createItineraryItem(
      this.toCreateData(tripId, input),
      {
        actorId: userId,
        deviceId: input.deviceId,
        clientMutationId: input.clientMutationId
      },
      {
        beforeItemId: input.beforeItemId,
        afterItemId: input.afterItemId
      }
    );

    if (!result.item || result.revision === null) {
      throw new ConflictError({ messageKey: 'errors.conflict.itineraryInsertionInvalid' });
    }

    return {
      item: result.item,
      revision: result.revision
    };
  }

  async updateItineraryItem(userId: string, itemId: string, input: UpdateItineraryItemInput) {
    const access = await this.repository.findItineraryItemTripId(itemId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryItem' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);
    const replay = await ensureIdempotentMutation(
      access.tripId,
      input.clientMutationId,
      async (mutation) => {
        if (!mutation.entityId) return null;

        const item = await this.repository.findItineraryItemById(mutation.entityId);
        return item ? { item, revision: mutation.revision } : null;
      }
    );

    if (replay) {
      return replay;
    }

    await this.trips.ensureExpectedRevision(
      access.tripId,
      input.expectedRevision,
      {
        entityVersion: access.version,
        latestEntity: {
          id: itemId,
          tripId: access.tripId,
          version: access.version
        }
      },
      {
        actorId: userId,
        entityType: 'ITINERARY_ITEM',
        entityId: itemId,
        operation: 'ENTITY_UPDATED',
        localPayload: input as Record<string, unknown>
      }
    );

    if (input.expectedVersion !== undefined && input.expectedVersion !== access.version) {
      throw new ConflictError('Itinerary item version conflict');
    }

    const data: Prisma.ItineraryItemUpdateInput = {
      version: { increment: 1 }
    };

    if (input.placeId !== undefined) {
      data.place = { connect: { id: input.placeId } };
    }
    if (input.types !== undefined) data.types = input.types;
    if (input.summary !== undefined) data.summary = input.summary;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.startsAt !== undefined)
      data.startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
    if (input.status !== undefined) data.status = input.status;
    if (input.metadata !== undefined) data.metadata = input.metadata;
    if (input.timezone !== undefined) data.timezone = input.timezone;

    if (input.clientMutationId !== undefined) {
      data.lastClientMutationId = input.clientMutationId;
    }

    return this.repository.updateItineraryItem(itemId, data, {
      tripId: access.tripId,
      actorId: userId,
      deviceId: input.deviceId,
      clientMutationId: input.clientMutationId
    });
  }

  async deleteItineraryItem(
    userId: string,
    itemId: string,
    query: DeleteItineraryItemQuery
  ): Promise<void> {
    const access = await this.repository.findItineraryItemTripId(itemId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryItem' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);
    const replay = await ensureIdempotentMutation(
      access.tripId,
      query.clientMutationId,
      async () => true
    );
    if (replay) {
      return;
    }

    await this.trips.ensureExpectedRevision(
      access.tripId,
      query.expectedRevision,
      {
        entityVersion: access.version,
        latestEntity: {
          id: itemId,
          tripId: access.tripId,
          version: access.version
        }
      },
      {
        actorId: userId,
        entityType: 'ITINERARY_ITEM',
        entityId: itemId,
        operation: 'ENTITY_DELETED',
        localPayload: query as Record<string, unknown>
      }
    );

    await this.repository.softDeleteItineraryItem(itemId, {
      tripId: access.tripId,
      actorId: userId,
      deviceId: query.deviceId,
      clientMutationId: query.clientMutationId
    });
  }

  async reorderItineraryItems(userId: string, tripId: string, input: ReorderItineraryItemsInput) {
    await this.trips.ensureCanEditTrip(userId, tripId);
    const replay = await ensureIdempotentMutation(
      tripId,
      input.clientMutationId,
      async (mutation) => {
        if (!mutation.entityId) return null;

        const item = await this.repository.findItineraryItemById(mutation.entityId);
        return item ? { item, affectedItems: [item], revision: mutation.revision } : null;
      }
    );

    if (replay) {
      return replay;
    }

    const access = await this.repository.findItineraryItemTripId(input.itemId);
    if (!access || access.tripId !== tripId) {
      throw new ConflictError('Itinerary reorder payload contains an item outside this trip');
    }

    await this.trips.ensureExpectedRevision(
      tripId,
      input.expectedRevision,
      {
        entityVersion: access.version,
        latestEntity: {
          id: input.itemId,
          tripId,
          version: access.version
        }
      },
      {
        actorId: userId,
        entityType: 'ITINERARY_ITEM',
        entityId: input.itemId,
        operation: 'ENTITY_MOVED',
        localPayload: input as Record<string, unknown>
      }
    );

    if (input.expectedVersion !== undefined && input.expectedVersion !== access.version) {
      throw new ConflictError('Itinerary reorder payload contains a stale item version');
    }

    const result = await this.repository.reorderItineraryItem(tripId, {
      ...input,
      actorId: userId
    });

    if (!result.item) {
      throw new ConflictError('Itinerary reorder payload contains an invalid neighbor');
    }

    return {
      item: result.item,
      affectedItems: result.affectedItems,
      revision: result.revision
    };
  }

  private toCreateData(
    tripId: string,
    input: CreateItineraryItemInput
  ): Prisma.ItineraryItemUncheckedCreateInput {
    const data: Prisma.ItineraryItemUncheckedCreateInput = {
      tripId,
      placeId: input.placeId,
      types: input.types
    };

    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.summary !== undefined) data.summary = input.summary;
    if (input.startsAt) data.startsAt = new Date(input.startsAt);
    if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
    if (input.status !== undefined) data.status = input.status;
    if (input.metadata !== undefined) data.metadata = input.metadata;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.clientMutationId !== undefined) data.lastClientMutationId = input.clientMutationId;

    return data;
  }
}

export const itineraryService = new ItineraryService();
