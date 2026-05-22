import type { Prisma } from '@prisma/client';

import { ConflictError } from '@/common/errors/conflict-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { parseDateOnly } from '@/common/utils/date.js';
import {
  itineraryRepository,
  type ItineraryRepository
} from '@/modules/itinerary/itinerary.repository.js';
import type {
  CreateDayInput,
  CreateItineraryItemInput,
  ReorderDaysInput,
  ReorderItineraryItemsInput,
  UpdateDayInput,
  UpdateItineraryItemInput
} from '@/modules/itinerary/itinerary.schemas.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

const hasSameIds = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  const leftSet = new Set(left);
  return right.every((id) => leftSet.has(id));
};

export class ItineraryService {
  constructor(
    private readonly repository: ItineraryRepository = itineraryRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async listDays(userId: string, tripId: string) {
    await this.trips.ensureCanAccessTrip(userId, tripId);
    return this.repository.listDays(tripId);
  }

  async createDay(userId: string, tripId: string, input: CreateDayInput) {
    await this.trips.ensureCanEditTrip(userId, tripId);

    const data: Prisma.TripDayUncheckedCreateInput = {
      tripId,
      date: parseDateOnly(input.date),
      order: input.order
    };

    if (input.title !== undefined) data.title = input.title;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.weatherSnapshot !== undefined) data.weatherSnapshot = input.weatherSnapshot;

    return this.repository.createDay(data);
  }

  async updateDay(userId: string, dayId: string, input: UpdateDayInput) {
    const day = await this.repository.findDayTripId(dayId);
    if (!day) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryDay' });
    }

    await this.trips.ensureCanEditTrip(userId, day.tripId);

    const data: Prisma.TripDayUpdateInput = {
      version: { increment: 1 }
    };
    if (input.date !== undefined) data.date = parseDateOnly(input.date);
    if (input.title !== undefined) data.title = input.title;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.order !== undefined) data.order = input.order;
    if (input.weatherSnapshot !== undefined) data.weatherSnapshot = input.weatherSnapshot;

    return this.repository.updateDay(dayId, data);
  }

  async deleteDay(userId: string, dayId: string): Promise<void> {
    const day = await this.repository.findDayTripId(dayId);
    if (!day) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryDay' });
    }

    await this.trips.ensureCanEditTrip(userId, day.tripId);
    await this.repository.deleteDay(dayId);
  }

  async reorderDays(userId: string, tripId: string, input: ReorderDaysInput) {
    await this.trips.ensureCanEditTrip(userId, tripId);

    const existingDays = await this.repository.findDayIds(tripId);
    const existingIds = existingDays.map((day) => day.id);

    if (!hasSameIds(existingIds, input.dayIds)) {
      throw new ConflictError('Day reorder payload must include each trip day exactly once');
    }

    return this.repository.reorderDays(tripId, input.dayIds);
  }

  async createItineraryItem(userId: string, dayId: string, input: CreateItineraryItemInput) {
    const day = await this.repository.findDayTripId(dayId);
    if (!day) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryDay' });
    }

    await this.trips.ensureCanEditTrip(userId, day.tripId);

    const data: Prisma.ItineraryItemUncheckedCreateInput = {
      dayId,
      title: input.title,
      timezone: input.timezone,
      status: input.status,
      order: input.order
    };

    if (input.placeId !== undefined) data.placeId = input.placeId;
    if (input.description !== undefined) data.description = input.description;
    if (input.startTime) data.startTime = new Date(input.startTime);
    if (input.endTime) data.endTime = new Date(input.endTime);
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
    if (input.travelMode !== undefined) data.travelMode = input.travelMode;
    if (input.travelTimeMinutes !== undefined) data.travelTimeMinutes = input.travelTimeMinutes;
    if (input.routePolyline !== undefined) data.routePolyline = input.routePolyline;
    if (input.bookingInfo !== undefined) data.bookingInfo = input.bookingInfo;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    return this.repository.createItineraryItem(data);
  }

  async updateItineraryItem(userId: string, itemId: string, input: UpdateItineraryItemInput) {
    const access = await this.repository.findItineraryItemTripId(itemId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryItem' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);

    const data: Prisma.ItineraryItemUpdateInput = {
      version: { increment: 1 }
    };

    if (input.dayId !== undefined && input.dayId !== access.dayId) {
      const targetDay = await this.repository.findDayTripId(input.dayId);
      if (!targetDay || targetDay.tripId !== access.tripId) {
        throw new NotFoundError({ resourceKey: 'resources.itineraryDay' });
      }
      data.day = { connect: { id: input.dayId } };
    }
    if (input.placeId !== undefined) {
      data.place = input.placeId ? { connect: { id: input.placeId } } : { disconnect: true };
    }
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.startTime !== undefined)
      data.startTime = input.startTime ? new Date(input.startTime) : null;
    if (input.endTime !== undefined) data.endTime = input.endTime ? new Date(input.endTime) : null;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.status !== undefined) data.status = input.status;
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
    if (input.travelMode !== undefined) data.travelMode = input.travelMode;
    if (input.travelTimeMinutes !== undefined) data.travelTimeMinutes = input.travelTimeMinutes;
    if (input.routePolyline !== undefined) data.routePolyline = input.routePolyline;
    if (input.bookingInfo !== undefined) data.bookingInfo = input.bookingInfo;
    if (input.metadata !== undefined) data.metadata = input.metadata;
    if (input.order !== undefined) data.order = input.order;

    return this.repository.updateItineraryItem(itemId, data);
  }

  async deleteItineraryItem(userId: string, itemId: string): Promise<void> {
    const access = await this.repository.findItineraryItemTripId(itemId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryItem' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);
    await this.repository.deleteItineraryItem(itemId);
  }

  async reorderItineraryItems(userId: string, tripId: string, input: ReorderItineraryItemsInput) {
    await this.trips.ensureCanEditTrip(userId, tripId);

    const itemIds = input.updates.map((update) => update.itemId);
    const targetDayIds = [...new Set(input.updates.map((update) => update.dayId))];
    const [items, targetDays] = await Promise.all([
      this.repository.findItineraryItemsForTrip(itemIds),
      this.repository.findTargetDays(tripId, targetDayIds)
    ]);

    if (items.length !== itemIds.length || items.some((item) => item.day.tripId !== tripId)) {
      throw new ConflictError('Itinerary reorder payload contains items outside this trip');
    }

    if (targetDays.length !== targetDayIds.length) {
      throw new ConflictError('Itinerary reorder payload contains target days outside this trip');
    }

    return this.repository.reorderItineraryItems(tripId, input.updates);
  }
}

export const itineraryService = new ItineraryService();
