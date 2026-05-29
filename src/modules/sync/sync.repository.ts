import type { MutationEvent, Prisma } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

export type ListMutationEventsFilters = {
  afterRevision?: bigint | undefined;
  limit: number;
};

export class SyncRepository {
  async listMutationEventsForTrip(
    tripId: string,
    filters: ListMutationEventsFilters
  ): Promise<{ events: MutationEvent[]; latestRevision: bigint }> {
    const where: Prisma.MutationEventWhereInput = {
      tripId
    };

    if (filters.afterRevision !== undefined) {
      where.revision = { gt: filters.afterRevision };
    }

    const [events, trip] = await prisma.$transaction([
      prisma.mutationEvent.findMany({
        where,
        orderBy: [{ revision: 'asc' }, { id: 'asc' }],
        take: filters.limit
      }),
      prisma.trip.findUnique({
        where: { id: tripId },
        select: { revision: true }
      })
    ]);

    return {
      events,
      latestRevision: trip?.revision ?? 0n
    };
  }
}

export const syncRepository = new SyncRepository();
