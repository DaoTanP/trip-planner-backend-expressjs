import type { Prisma } from '@prisma/client';

import { ConflictError } from '@/common/errors/conflict-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import {
  itineraryRepository,
  type ItineraryRepository
} from '@/modules/itinerary/itinerary.repository.js';
import type {
  CreateItineraryItemInput,
  ReorderItineraryItemsInput,
  UpdateItineraryItemInput
} from '@/modules/itinerary/itinerary.schemas.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

const orderStride = 1024;

const hasDuplicateIds = (ids: string[]) => new Set(ids).size !== ids.length;

export class ItineraryService {
  constructor(
    private readonly repository: ItineraryRepository = itineraryRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async listItems(userId: string, tripId: string) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    return this.repository.listItems(tripId);
  }

  async listPlacesForTrip(userId: string, tripId: string) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    return this.repository.listPlacesForTrip(tripId);
  }

  async createItineraryItem(userId: string, tripId: string, input: CreateItineraryItemInput) {
    await this.trips.ensureCanEditTrip(userId, tripId);

    return this.repository.createItineraryItem(await this.toCreateData(tripId, input));
  }

  async createItineraryItemForLegacyDay(
    userId: string,
    legacyDayId: string,
    input: CreateItineraryItemInput
  ) {
    const day = await this.repository.findLegacyDayTripId(legacyDayId);
    if (!day) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryDay' });
    }

    await this.trips.ensureCanEditTrip(userId, day.tripId);

    return this.repository.createItineraryItem({
      ...(await this.toCreateData(day.tripId, input)),
      legacyDayId
    });
  }

  async updateItineraryItem(userId: string, itemId: string, input: UpdateItineraryItemInput) {
    const access = await this.repository.findItineraryItemTripId(itemId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryItem' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);

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

    return this.repository.updateItineraryItem(itemId, data);
  }

  async deleteItineraryItem(userId: string, itemId: string): Promise<void> {
    const access = await this.repository.findItineraryItemTripId(itemId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryItem' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);
    await this.repository.softDeleteItineraryItem(itemId);
  }

  async reorderItineraryItems(userId: string, tripId: string, input: ReorderItineraryItemsInput) {
    await this.trips.ensureCanEditTrip(userId, tripId);

    const itemIds = input.updates.map((update) => update.itemId);
    if (hasDuplicateIds(itemIds)) {
      throw new ConflictError('Itinerary reorder payload contains duplicate items');
    }

    const items = await this.repository.findItineraryItemsForTrip(itemIds);
    if (items.length !== itemIds.length || items.some((item) => item.tripId !== tripId)) {
      throw new ConflictError('Itinerary reorder payload contains items outside this trip');
    }

    const itemVersions = new Map(items.map((item) => [item.id, item.version]));
    const staleUpdate = input.updates.find(
      (update) =>
        update.expectedVersion !== undefined &&
        itemVersions.get(update.itemId) !== update.expectedVersion
    );

    if (staleUpdate) {
      throw new ConflictError('Itinerary reorder payload contains a stale item version');
    }

    return this.repository.reorderItineraryItems(tripId, input.updates);
  }

  private async toCreateData(
    tripId: string,
    input: CreateItineraryItemInput
  ): Promise<Prisma.ItineraryItemUncheckedCreateInput> {
    const sortOrder =
      input.sortOrder ??
      ((await this.repository.getMaxSortOrder(tripId))._max.sortOrder ?? 0) + orderStride;

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

    return data;
  }
}

export const itineraryService = new ItineraryService();
