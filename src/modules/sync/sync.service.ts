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
    const sinceRevision = query.cursor ?? query.sinceRevision ?? query.afterRevision;

    return this.repository.listMutationEventsForTrip(tripId, {
      sinceRevision: sinceRevision !== undefined ? BigInt(sinceRevision) : undefined,
      limit: Math.min(Math.max(query.limit, 1), 500)
    });
  }
}

export const syncService = new SyncService();
