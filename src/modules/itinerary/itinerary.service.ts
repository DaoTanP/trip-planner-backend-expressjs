import type { Prisma } from '@prisma/client';

import { NotFoundError } from '@/common/errors/not-found-error.js';
import { parseDateOnly } from '@/common/utils/date.js';
import {
  itineraryRepository,
  type ItineraryRepository
} from '@/modules/itinerary/itinerary.repository.js';
import type {
  CreateActivityInput,
  CreateDayInput,
  UpdateActivityInput
} from '@/modules/itinerary/itinerary.schemas.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

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

    const data: Prisma.ItineraryDayUncheckedCreateInput = {
      tripId,
      date: parseDateOnly(input.date),
      order: input.order
    };

    if (input.title !== undefined) data.title = input.title;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.weatherSnapshot !== undefined) data.weatherSnapshot = input.weatherSnapshot;

    return this.repository.createDay(data);
  }

  async createActivity(userId: string, dayId: string, input: CreateActivityInput) {
    const day = await this.repository.findDayTripId(dayId);
    if (!day) {
      throw new NotFoundError({ resourceKey: 'resources.itineraryDay' });
    }

    await this.trips.ensureCanEditTrip(userId, day.tripId);

    const data: Prisma.ActivityUncheckedCreateInput = {
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
    if (input.bookingInfo !== undefined) data.bookingInfo = input.bookingInfo;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    return this.repository.createActivity(data);
  }

  async updateActivity(userId: string, activityId: string, input: UpdateActivityInput) {
    const access = await this.repository.findActivityTripId(activityId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.activity' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);

    const data: Prisma.ActivityUpdateInput = {};
    if (input.placeId !== undefined) {
      data.place = input.placeId ? { connect: { id: input.placeId } } : { disconnect: true };
    }
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.startTime !== undefined) data.startTime = input.startTime ? new Date(input.startTime) : null;
    if (input.endTime !== undefined) data.endTime = input.endTime ? new Date(input.endTime) : null;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.status !== undefined) data.status = input.status;
    if (input.cost !== undefined) data.cost = input.cost;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.bookingInfo !== undefined) data.bookingInfo = input.bookingInfo;
    if (input.metadata !== undefined) data.metadata = input.metadata;
    if (input.order !== undefined) data.order = input.order;

    return this.repository.updateActivity(activityId, data);
  }

  async deleteActivity(userId: string, activityId: string): Promise<void> {
    const access = await this.repository.findActivityTripId(activityId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.activity' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);
    await this.repository.deleteActivity(activityId);
  }
}

export const itineraryService = new ItineraryService();
