import type { Prisma, TripRole, UserRole } from '@prisma/client';

import { AuthorizationError } from '@/common/errors/authorization-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { normalizeCursorLimit } from '@/common/utils/cursor-pagination.js';
import { parseDateOnly } from '@/common/utils/date.js';
import type {
  CreateTripInput,
  ListTripExpensesQuery,
  ListTripsQuery,
  UpdateTripInput
} from '@/modules/trips/trips.schemas.js';
import { tripsRepository, type TripsRepository } from '@/modules/trips/trips.repository.js';

const editableRoles: TripRole[] = ['OWNER', 'EDITOR'];

export type TripAccessContext = {
  tripId: string;
  role: TripRole | 'ADMIN';
  isOwner: boolean;
  canEdit: boolean;
  canModerate: boolean;
};

export class TripsService {
  constructor(private readonly repository: TripsRepository = tripsRepository) {}

  async listTrips(userId: string, query: ListTripsQuery) {
    const filters: { status?: ListTripsQuery['status']; page: number; limit: number } = {
      page: query.page,
      limit: query.limit
    };

    if (query.status !== undefined) {
      filters.status = query.status;
    }

    const result = await this.repository.findForUser(userId, filters);

    return {
      items: result.items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / query.limit),
        hasNextPage: query.page * query.limit < result.total,
        hasPreviousPage: query.page > 1
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

    return this.repository.create(data, userId);
  }

  async getTrip(userId: string, tripId: string) {
    await this.ensureCanAccessTrip(userId, tripId);
    const trip = await this.repository.findById(tripId);

    if (!trip) {
      throw new NotFoundError({ resourceKey: 'resources.trip' });
    }

    return trip;
  }

  async updateTrip(userId: string, tripId: string, input: UpdateTripInput) {
    await this.ensureCanEditTrip(userId, tripId);

    const data: Prisma.TripUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.startDate !== undefined)
      data.startDate = input.startDate ? parseDateOnly(input.startDate) : null;
    if (input.endDate !== undefined)
      data.endDate = input.endDate ? parseDateOnly(input.endDate) : null;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.visibility !== undefined) data.visibility = input.visibility;
    if (input.status !== undefined) data.status = input.status;
    if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl;
    if (input.preferences !== undefined) data.preferences = input.preferences;
    if (input.metadata !== undefined) data.metadata = input.metadata;
    data.version = { increment: 1 };

    await this.repository.update(tripId, data, {
      actorId: userId,
      clientMutationId: input.clientMutationId,
      deviceId: input.deviceId
    });

    const trip = await this.repository.findById(tripId);
    if (!trip) {
      throw new NotFoundError({ resourceKey: 'resources.trip' });
    }

    return trip;
  }

  async deleteTrip(userId: string, tripId: string): Promise<void> {
    const access = await this.repository.findAccess(tripId, userId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.trip' });
    }
    if (access.ownerId !== userId) {
      throw new AuthorizationError({ messageKey: 'errors.authorization.tripOwnerDelete' });
    }

    await this.repository.delete(tripId);
  }

  async listCollaborators(userId: string, tripId: string) {
    await this.ensureCanAccessTrip(userId, tripId);

    return this.repository.listCollaborators(tripId);
  }

  async getExpenses(userId: string, tripId: string, query: ListTripExpensesQuery) {
    await this.ensureCanAccessTrip(userId, tripId);

    return this.repository.getExpenses(tripId, {
      cursor: query.cursor,
      limit: normalizeCursorLimit(query.limit)
    });
  }

  async getAccessContext(
    userId: string,
    tripId: string,
    userRole?: UserRole
  ): Promise<TripAccessContext> {
    if (userRole === 'ADMIN') {
      const trip = await this.repository.findIdentity(tripId);
      if (!trip) {
        throw new NotFoundError({ resourceKey: 'resources.trip' });
      }

      return {
        tripId,
        role: 'ADMIN',
        isOwner: trip.ownerId === userId,
        canEdit: true,
        canModerate: true
      };
    }

    const access = await this.repository.findAccess(tripId, userId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.trip' });
    }

    const role: TripRole =
      access.ownerId === userId ? 'OWNER' : (access.collaborators[0]?.role ?? 'VIEWER');

    return {
      tripId,
      role,
      isOwner: access.ownerId === userId,
      canEdit: editableRoles.includes(role),
      canModerate: role === 'OWNER'
    };
  }

  async ensureCanAccessTrip(userId: string, tripId: string, userRole?: UserRole): Promise<void> {
    await this.getAccessContext(userId, tripId, userRole);
  }

  async ensureCanEditTrip(userId: string, tripId: string, userRole?: UserRole): Promise<void> {
    const access = await this.getAccessContext(userId, tripId, userRole);
    if (!access.canEdit) {
      throw new AuthorizationError();
    }
  }
}

export const tripsService = new TripsService();
