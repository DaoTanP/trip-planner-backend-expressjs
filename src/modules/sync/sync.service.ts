import type { ListMutationEventsQuery } from '@/modules/sync/sync.schemas.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';
import { syncRepository, type SyncRepository } from '@/modules/sync/sync.repository.js';

export class SyncService {
  constructor(
    private readonly repository: SyncRepository = syncRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async listMutationEvents(userId: string, tripId: string, query: ListMutationEventsQuery) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    return this.repository.listMutationEventsForTrip(tripId, {
      afterRevision: query.afterRevision !== undefined ? BigInt(query.afterRevision) : undefined,
      limit: Math.min(Math.max(query.limit, 1), 500)
    });
  }
}

export const syncService = new SyncService();
