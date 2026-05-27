import { normalizeCursorLimit } from '@/common/utils/cursor-pagination.js';
import { routesRepository, type RoutesRepository } from '@/modules/routes/routes.repository.js';
import type { ListTripRoutesQuery } from '@/modules/routes/routes.schemas.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

export class RoutesService {
  constructor(
    private readonly repository: RoutesRepository = routesRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async listRoutes(userId: string, tripId: string, query: ListTripRoutesQuery) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    return this.repository.listForTrip(tripId, {
      cursor: query.cursor,
      limit: normalizeCursorLimit(query.limit)
    });
  }
}

export const routesService = new RoutesService();
