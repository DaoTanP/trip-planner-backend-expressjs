import { ConflictError } from '@/common/errors/conflict-error.js';
import { ensureIdempotentMutation } from '@/modules/sync/idempotency.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

import {
  routePreferencesRepository,
  type RoutePreferencesRepository
} from './route-preferences.repository.js';
import type {
  UpsertTripRoutePreferenceInput,
  UpsertTripRoutePreferenceParams
} from './route-preferences.schemas.js';

export class RoutePreferencesService {
  constructor(
    private readonly repository: RoutePreferencesRepository = routePreferencesRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async listTripRoutePreferences(userId: string, tripId: string) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    return this.repository.listByTripId(tripId);
  }

  async upsertTripRoutePreference(
    userId: string,
    params: UpsertTripRoutePreferenceParams,
    input: UpsertTripRoutePreferenceInput
  ) {
    await this.trips.ensureCanEditTrip(userId, params.tripId);
    const replay = await ensureIdempotentMutation(
      params.tripId,
      input.clientMutationId,
      async (mutation) => {
        if (!mutation.entityId) return null;

        const routePreference = await this.repository.findById(mutation.entityId);
        return routePreference && mutation.revision
          ? { routePreference, revision: mutation.revision }
          : null;
      }
    );

    if (replay) {
      return replay;
    }

    await this.trips.ensureExpectedRevision(params.tripId, input.expectedRevision, undefined, {
      actorId: userId,
      entityType: 'ROUTE_PREFERENCE',
      entityId: `${params.fromItemId}:${params.toItemId}`,
      operation: 'ENTITY_UPDATED',
      localPayload: input as Record<string, unknown>
    });
    await this.ensureItemsBelongToTrip(params.tripId, params.fromItemId, params.toItemId);

    return this.repository.upsertRoutePreference(
      params.tripId,
      {
        fromItemId: params.fromItemId,
        toItemId: params.toItemId,
        travelMode: input.travelMode
      },
      {
        tripId: params.tripId,
        actorId: userId,
        deviceId: input.deviceId,
        clientMutationId: input.clientMutationId
      }
    );
  }

  private async ensureItemsBelongToTrip(tripId: string, fromItemId: string, toItemId: string) {
    const itemIds = await this.repository.findActiveItemIdsInTrip(tripId, [fromItemId, toItemId]);
    const activeItemIds = new Set(itemIds.map((item) => item.id));

    if (!activeItemIds.has(fromItemId) || !activeItemIds.has(toItemId)) {
      throw new ConflictError(
        'Route preference endpoints must reference active itinerary items in this trip'
      );
    }
  }
}

export const routePreferencesService = new RoutePreferencesService();
