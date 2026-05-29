import type { MutationEvent, Prisma } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

export type ListMutationEventsFilters = {
  sinceRevision?: bigint | undefined;
  cursor?: bigint | undefined;
  limit: number;
};

export type ListMutationEventsResult = {
  events: MutationEvent[];
  latestRevision: bigint;
  hasMore: boolean;
  nextCursor: string | null;
};

export class SyncRepository {
  async listMutationEventsForTrip(
    tripId: string,
    filters: ListMutationEventsFilters
  ): Promise<ListMutationEventsResult> {
    const lowerBoundRevision = filters.cursor ?? filters.sinceRevision;
    const where: Prisma.MutationEventWhereInput = {
      tripId
    };

    if (lowerBoundRevision !== undefined) {
      where.revision = { gt: lowerBoundRevision };
    }

    const [events, trip] = await prisma.$transaction([
      prisma.mutationEvent.findMany({
        where,
        orderBy: [{ revision: 'asc' }, { id: 'asc' }],
        take: filters.limit + 1
      }),
      prisma.trip.findUnique({
        where: { id: tripId },
        select: { revision: true }
      })
    ]);
    const visibleEvents = events.slice(0, filters.limit);
    const lastEvent = visibleEvents[visibleEvents.length - 1];

    return {
      events: visibleEvents,
      latestRevision: trip?.revision ?? 0n,
      hasMore: events.length > filters.limit,
      nextCursor: events.length > filters.limit && lastEvent ? lastEvent.revision.toString() : null
    };
  }
}

export const syncRepository = new SyncRepository();
