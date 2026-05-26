import { routesRepository, type RoutesRepository } from '@/modules/routes/routes.repository.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

export class RoutesService {
  constructor(
    private readonly repository: RoutesRepository = routesRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async listRoutes(userId: string, tripId: string) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    return this.repository.listForTrip(tripId);
  }
}

export const routesService = new RoutesService();
