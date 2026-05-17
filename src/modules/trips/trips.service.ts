import type { Prisma, TripRole } from '@prisma/client';

import { AuthorizationError } from '@/common/errors/authorization-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { parseDateOnly } from '@/common/utils/date.js';
import type {
  CreateTripInput,
  ListTripsQuery,
  UpdateTripInput
} from '@/modules/trips/trips.schemas.js';
import { tripsRepository, type TripsRepository } from '@/modules/trips/trips.repository.js';

const editableRoles: TripRole[] = ['OWNER', 'EDITOR'];

export class TripsService {
  constructor(private readonly repository: TripsRepository = tripsRepository) {}

  async listTrips(userId: string, query: ListTripsQuery) {
    const result = await this.repository.findForUser(userId, query);

    return {
      items: result.items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit)
      }
    };
  }

  createTrip(userId: string, input: CreateTripInput) {
    const data: Prisma.TripUncheckedCreateInput = {
      ownerId: userId,
      title: input.title,
      timezone: input.timezone,
      visibility: input.visibility
    };

    if (input.description !== undefined) data.description = input.description;
    if (input.startDate) data.startDate = parseDateOnly(input.startDate);
    if (input.endDate) data.endDate = parseDateOnly(input.endDate);
    if (input.preferences !== undefined) data.preferences = input.preferences;
    if (input.budget !== undefined) data.budget = input.budget;

    return this.repository.create(data);
  }

  async getTrip(userId: string, tripId: string) {
    await this.ensureCanAccessTrip(userId, tripId);
    const trip = await this.repository.findById(tripId);

    if (!trip) {
      throw new NotFoundError('Trip');
    }

    return trip;
  }

  async updateTrip(userId: string, tripId: string, input: UpdateTripInput) {
    await this.ensureCanEditTrip(userId, tripId);

    const data: Prisma.TripUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.startDate !== undefined) data.startDate = input.startDate ? parseDateOnly(input.startDate) : null;
    if (input.endDate !== undefined) data.endDate = input.endDate ? parseDateOnly(input.endDate) : null;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.status !== undefined) data.status = input.status;
    if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl;
    if (input.preferences !== undefined) data.preferences = input.preferences;
    if (input.budget !== undefined) data.budget = input.budget;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    return this.repository.update(tripId, data);
  }

  async deleteTrip(userId: string, tripId: string): Promise<void> {
    const access = await this.repository.findAccess(tripId, userId);
    if (!access) {
      throw new NotFoundError('Trip');
    }
    if (access.ownerId !== userId) {
      throw new AuthorizationError('Only the trip owner can delete a trip');
    }

    await this.repository.delete(tripId);
  }

  async ensureCanAccessTrip(userId: string, tripId: string): Promise<void> {
    const access = await this.repository.findAccess(tripId, userId);
    if (!access) {
      throw new NotFoundError('Trip');
    }
  }

  async ensureCanEditTrip(userId: string, tripId: string): Promise<void> {
    const access = await this.repository.findAccess(tripId, userId);
    if (!access) {
      throw new NotFoundError('Trip');
    }

    const role: TripRole = access.ownerId === userId ? 'OWNER' : (access.collaborators[0]?.role ?? 'VIEWER');
    if (!editableRoles.includes(role)) {
      throw new AuthorizationError();
    }
  }
}

export const tripsService = new TripsService();
