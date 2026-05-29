import type { Prisma } from '@prisma/client';

import { ConflictError } from '@/common/errors/conflict-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { normalizeCursorLimit } from '@/common/utils/cursor-pagination.js';
import { itineraryOrderStride } from '@/modules/itinerary/itinerary-ordering.js';
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

    await this.trips.ensureExpectedRevision(tripId, input.expectedRevision);

    return this.repository.createItineraryItem(await this.toCreateData(tripId, input), {
      actorId: userId,
      deviceId: input.deviceId,
      clientMutationId: input.clientMutationId,
      operation: 'ENTITY_CREATED'
    });
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

    await this.trips.ensureExpectedRevision(access.tripId, input.expectedRevision, {
      entityVersion: access.version,
      latestEntity: {
        id: itemId,
        tripId: access.tripId,
        version: access.version
      }
    });

    if (input.expectedVersion !== undefined && input.expectedVersion !== access.version) {
      throw new ConflictError('Itinerary item version conflict');
    }

    const data: Prisma.ItineraryItemUpdateInput = {
      version: { increment: 1 }
    };

    if (input.placeId !== undefined) {
      data.place = input.placeId ? { connect: { id: input.placeId } } : { disconnect: true };
    }
    if (input.routeSegmentId !== undefined) {
      data.routeSegment = input.routeSegmentId
        ? { connect: { id: input.routeSegmentId } }
        : { disconnect: true };
    }
    if (input.type !== undefined) data.type = input.type;
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.startTime !== undefined)
      data.startTime = input.startTime ? new Date(input.startTime) : null;
    if (input.endTime !== undefined) data.endTime = input.endTime ? new Date(input.endTime) : null;
    if (input.isFlexibleTime !== undefined) data.isFlexibleTime = input.isFlexibleTime;
    if (input.isAllDay !== undefined) data.isAllDay = input.isAllDay;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.status !== undefined) data.status = input.status;
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
    if (input.bookingInfo !== undefined) data.bookingInfo = input.bookingInfo;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    if (input.clientMutationId !== undefined) {
      data.lastClientMutationId = input.clientMutationId;
    }

    return this.repository.updateItineraryItem(itemId, data, {
      tripId: access.tripId,
      actorId: userId,
      deviceId: input.deviceId,
      clientMutationId: input.clientMutationId,
      operation: 'ENTITY_UPDATED'
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

    await this.trips.ensureExpectedRevision(access.tripId, query.expectedRevision, {
      entityVersion: access.version,
      latestEntity: {
        id: itemId,
        tripId: access.tripId,
        version: access.version
      }
    });

    await this.repository.softDeleteItineraryItem(itemId, {
      tripId: access.tripId,
      actorId: userId,
      deviceId: query.deviceId,
      clientMutationId: query.clientMutationId,
      operation: 'ENTITY_DELETED'
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

    await this.trips.ensureExpectedRevision(tripId, input.expectedRevision, {
      entityVersion: access.version,
      latestEntity: {
        id: input.itemId,
        tripId,
        version: access.version
      }
    });

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

  private async toCreateData(
    tripId: string,
    input: CreateItineraryItemInput
  ): Promise<Prisma.ItineraryItemUncheckedCreateInput> {
    const sortOrder =
      input.sortOrder ??
      ((await this.repository.getMaxSortOrder(tripId))._max.sortOrder ?? 0) + itineraryOrderStride;

    const data: Prisma.ItineraryItemUncheckedCreateInput = {
      tripId,
      title: input.title,
      type: input.type,
      timezone: input.timezone,
      status: input.status,
      isFlexibleTime: input.isFlexibleTime,
      isAllDay: input.isAllDay,
      sortOrder
    };

    if (input.placeId !== undefined) data.placeId = input.placeId;
    if (input.routeSegmentId !== undefined) data.routeSegmentId = input.routeSegmentId;
    if (input.description !== undefined) data.description = input.description;
    if (input.startTime) data.startTime = new Date(input.startTime);
    if (input.endTime) data.endTime = new Date(input.endTime);
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
    if (input.bookingInfo !== undefined) data.bookingInfo = input.bookingInfo;
    if (input.metadata !== undefined) data.metadata = input.metadata;
    if (input.clientMutationId !== undefined) data.lastClientMutationId = input.clientMutationId;

    return data;
  }
}

export const itineraryService = new ItineraryService();
