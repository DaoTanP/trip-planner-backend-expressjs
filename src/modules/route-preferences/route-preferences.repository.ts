import type { Prisma, TripRoutePreference } from '@prisma/client';

import {
  appendMutationEvent,
  createEntityPatchPayload,
  syncOperations
} from '@/modules/sync/mutation-event-log.js';
import { prisma } from '@/prisma/client.js';

type RoutePreferenceMutationInput = {
  tripId: string;
  actorId: string;
  deviceId?: string | undefined;
  clientMutationId?: string | undefined;
};

type RoutePreferenceMutationResult = {
  routePreference: TripRoutePreference;
  revision: bigint;
};

const routePreferenceEntityType = 'TRIP_ROUTE_PREFERENCE';

const routePreferencePatchFields = (
  routePreference: TripRoutePreference
): Prisma.InputJsonObject => ({
  id: routePreference.id,
  tripId: routePreference.tripId,
  fromItemId: routePreference.fromItemId,
  toItemId: routePreference.toItemId,
  travelMode: routePreference.travelMode,
  version: routePreference.version,
  createdAt: routePreference.createdAt.toISOString(),
  updatedAt: routePreference.updatedAt.toISOString()
});

export class RoutePreferencesRepository {
  listByTripId(tripId: string): Promise<TripRoutePreference[]> {
    return prisma.tripRoutePreference.findMany({
      where: { tripId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });
  }

  findById(id: string): Promise<TripRoutePreference | null> {
    return prisma.tripRoutePreference.findUnique({
      where: { id }
    });
  }

  findActiveItemIdsInTrip(tripId: string, itemIds: string[]): Promise<Array<{ id: string }>> {
    return prisma.itineraryItem.findMany({
      where: {
        tripId,
        deletedAt: null,
        id: { in: itemIds }
      },
      select: { id: true }
    });
  }

  upsertRoutePreference(
    tripId: string,
    input: {
      fromItemId: string;
      toItemId: string;
      travelMode: string;
    },
    mutation: RoutePreferenceMutationInput
  ): Promise<RoutePreferenceMutationResult> {
    return prisma.$transaction(async (tx) => {
      const where = {
        tripId_fromItemId_toItemId: {
          tripId,
          fromItemId: input.fromItemId,
          toItemId: input.toItemId
        }
      };
      const existing = await tx.tripRoutePreference.findUnique({
        where,
        select: { id: true }
      });
      const clientMutationPatch =
        mutation.clientMutationId !== undefined
          ? { lastClientMutationId: mutation.clientMutationId }
          : {};
      const operation = existing ? syncOperations.updated : syncOperations.created;
      const routePreference = await tx.tripRoutePreference.upsert({
        where,
        create: {
          tripId,
          fromItemId: input.fromItemId,
          toItemId: input.toItemId,
          travelMode: input.travelMode,
          ...clientMutationPatch
        },
        update: {
          travelMode: input.travelMode,
          version: { increment: 1 },
          ...clientMutationPatch
        }
      });
      const revision = await appendMutationEvent(tx, {
        tripId,
        actorId: mutation.actorId,
        deviceId: mutation.deviceId,
        clientMutationId: mutation.clientMutationId,
        entityType: routePreferenceEntityType,
        entityId: routePreference.id,
        operation,
        payload: createEntityPatchPayload({
          patchType: operation,
          entityType: routePreferenceEntityType,
          entityId: routePreference.id,
          fields: routePreferencePatchFields(routePreference)
        })
      });

      return { routePreference, revision };
    });
  }
}

export const routePreferencesRepository = new RoutePreferencesRepository();
