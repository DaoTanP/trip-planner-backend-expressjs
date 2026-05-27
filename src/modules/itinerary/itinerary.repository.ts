import type { ItineraryItem, Prisma } from '@prisma/client';

import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  type CursorPage
} from '@/common/utils/cursor-pagination.js';
import { prisma } from '@/prisma/client.js';

const itemOrderBy = [
  { sortOrder: 'asc' },
  { id: 'asc' }
] satisfies Prisma.ItineraryItemOrderByWithRelationInput[];

const orderStride = 1024;
const spacedOrder = (index: number) => (index + 1) * orderStride;

type SortOrderCursor = {
  sortOrder: number;
  id: string;
};

type ItineraryMutationInput = {
  actorId: string;
  clientMutationId?: string | undefined;
  operation: string;
};

type ReorderInput = {
  itemId: string;
  beforeItemId?: string | null | undefined;
  afterItemId?: string | null | undefined;
  expectedVersion?: number;
  clientMutationId?: string | undefined;
  actorId: string;
};

const sortOrderCursorWhere = (cursor: SortOrderCursor | null): Prisma.ItineraryItemWhereInput =>
  cursor
    ? {
        OR: [
          { sortOrder: { gt: cursor.sortOrder } },
          {
            sortOrder: cursor.sortOrder,
            id: { gt: cursor.id }
          }
        ]
      }
    : {};

const itineraryItemCursor = (item: Pick<ItineraryItem, 'sortOrder' | 'id'>): string =>
  encodeCursor({
    sortOrder: item.sortOrder,
    id: item.id
  });

const midpoint = (lower: number, upper: number): number | null =>
  upper - lower > 1 ? lower + Math.floor((upper - lower) / 2) : null;

export class ItineraryRepository {
  async listItems(
    tripId: string,
    filters: { cursor?: string | undefined; limit: number }
  ): Promise<CursorPage<ItineraryItem>> {
    const cursor = decodeCursor<SortOrderCursor>(filters.cursor);
    const items = await prisma.itineraryItem.findMany({
      where: {
        tripId,
        deletedAt: null,
        ...sortOrderCursorWhere(cursor)
      },
      orderBy: itemOrderBy,
      take: filters.limit + 1
    });

    return buildCursorPage(items, filters.limit, itineraryItemCursor);
  }

  listPlacesForTrip(tripId: string) {
    return prisma.place.findMany({
      where: {
        itineraryItems: {
          some: {
            tripId,
            deletedAt: null
          }
        }
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }]
    });
  }

  getMaxSortOrder(tripId: string) {
    return prisma.itineraryItem.aggregate({
      where: {
        tripId,
        deletedAt: null
      },
      _max: {
        sortOrder: true
      }
    });
  }

  createItineraryItem(
    data: Prisma.ItineraryItemUncheckedCreateInput,
    mutation: ItineraryMutationInput
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.itineraryItem.create({
        data
      });
      await this.recordClientMutation(tx, {
        ...mutation,
        tripId: item.tripId,
        entityType: 'ITINERARY_ITEM',
        entityId: item.id
      });

      return item;
    });
  }

  findItineraryItemTripId(itemId: string): Promise<{ tripId: string; version: number } | null> {
    return prisma.itineraryItem.findFirst({
      where: { id: itemId, deletedAt: null },
      select: {
        tripId: true,
        version: true
      }
    });
  }

  updateItineraryItem(
    id: string,
    data: Prisma.ItineraryItemUpdateInput,
    mutation: ItineraryMutationInput & { tripId: string }
  ) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.itineraryItem.update({
        where: { id },
        data
      });
      await this.recordClientMutation(tx, {
        ...mutation,
        entityType: 'ITINERARY_ITEM',
        entityId: item.id
      });

      return item;
    });
  }

  softDeleteItineraryItem(id: string): Promise<ItineraryItem> {
    return prisma.itineraryItem.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        version: { increment: 1 }
      }
    });
  }

  reorderItineraryItem(
    tripId: string,
    input: ReorderInput
  ): Promise<{ item: ItineraryItem | null; affectedItems: ItineraryItem[] }> {
    return prisma.$transaction(async (tx) => {
      const item = await tx.itineraryItem.findFirst({
        where: {
          id: input.itemId,
          tripId,
          deletedAt: null
        }
      });

      if (!item) {
        return { item: null, affectedItems: [] };
      }

      const neighbors = await tx.itineraryItem.findMany({
        where: {
          tripId,
          deletedAt: null,
          id: {
            in: [input.beforeItemId, input.afterItemId].filter(Boolean) as string[]
          }
        },
        select: {
          id: true,
          sortOrder: true
        }
      });

      const before = input.beforeItemId
        ? neighbors.find((neighbor) => neighbor.id === input.beforeItemId)
        : null;
      const after = input.afterItemId
        ? neighbors.find((neighbor) => neighbor.id === input.afterItemId)
        : null;

      if ((input.beforeItemId && !before) || (input.afterItemId && !after)) {
        return { item: null, affectedItems: [] };
      }

      const position = await this.resolveTargetWindow(tx, tripId, item.id, before, after);
      const nextSortOrder = midpoint(position.lowerSortOrder, position.upperSortOrder);

      if (nextSortOrder !== null) {
        const updated = await tx.itineraryItem.update({
          where: { id: item.id },
          data: {
            sortOrder: nextSortOrder,
            version: { increment: 1 },
            ...(input.clientMutationId ? { lastClientMutationId: input.clientMutationId } : {})
          }
        });
        await this.recordClientMutation(tx, {
          tripId,
          actorId: input.actorId,
          clientMutationId: input.clientMutationId,
          entityType: 'ITINERARY_ITEM',
          entityId: item.id,
          operation: 'REORDER'
        });

        return { item: updated, affectedItems: [updated] };
      }

      const rebalanced = await this.rebalanceAroundMove(
        tx,
        tripId,
        item.id,
        before?.id,
        after?.id,
        input.clientMutationId
      );
      await this.recordClientMutation(tx, {
        tripId,
        actorId: input.actorId,
        clientMutationId: input.clientMutationId,
        entityType: 'ITINERARY_ITEM',
        entityId: item.id,
        operation: 'REORDER_REBALANCE'
      });

      return {
        item: rebalanced.find((candidate) => candidate.id === item.id) ?? null,
        affectedItems: rebalanced
      };
    });
  }

  private async resolveTargetWindow(
    tx: Prisma.TransactionClient,
    tripId: string,
    movingItemId: string,
    before: { id: string; sortOrder: number } | null | undefined,
    after: { id: string; sortOrder: number } | null | undefined
  ) {
    if (before && after) {
      return {
        lowerSortOrder: after.sortOrder,
        upperSortOrder: before.sortOrder
      };
    }

    if (before) {
      const previous = await tx.itineraryItem.findFirst({
        where: {
          tripId,
          deletedAt: null,
          id: { not: movingItemId },
          sortOrder: { lt: before.sortOrder }
        },
        orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
        select: { sortOrder: true }
      });

      return {
        lowerSortOrder: previous?.sortOrder ?? 0,
        upperSortOrder: before.sortOrder
      };
    }

    if (after) {
      const next = await tx.itineraryItem.findFirst({
        where: {
          tripId,
          deletedAt: null,
          id: { not: movingItemId },
          sortOrder: { gt: after.sortOrder }
        },
        orderBy: itemOrderBy,
        select: { sortOrder: true }
      });

      return {
        lowerSortOrder: after.sortOrder,
        upperSortOrder: next?.sortOrder ?? after.sortOrder + orderStride * 2
      };
    }

    const maxSortOrder = await tx.itineraryItem.aggregate({
      where: {
        tripId,
        deletedAt: null,
        id: { not: movingItemId }
      },
      _max: {
        sortOrder: true
      }
    });

    const lowerSortOrder = maxSortOrder._max.sortOrder ?? 0;
    return {
      lowerSortOrder,
      upperSortOrder: lowerSortOrder + orderStride * 2
    };
  }

  private async rebalanceAroundMove(
    tx: Prisma.TransactionClient,
    tripId: string,
    movingItemId: string,
    beforeItemId?: string,
    afterItemId?: string,
    clientMutationId?: string
  ): Promise<ItineraryItem[]> {
    const items = await tx.itineraryItem.findMany({
      where: {
        tripId,
        deletedAt: null
      },
      orderBy: itemOrderBy
    });
    const movingItem = items.find((item) => item.id === movingItemId);
    if (!movingItem) {
      return [];
    }

    const orderedItems = items.filter((item) => item.id !== movingItemId);
    const targetIndex =
      beforeItemId !== undefined
        ? orderedItems.findIndex((item) => item.id === beforeItemId)
        : afterItemId !== undefined
          ? orderedItems.findIndex((item) => item.id === afterItemId) + 1
          : orderedItems.length;

    orderedItems.splice(Math.max(targetIndex, 0), 0, movingItem);

    await Promise.all(
      orderedItems.map((orderedItem, index) =>
        tx.itineraryItem.update({
          where: { id: orderedItem.id },
          data: {
            sortOrder: spacedOrder(index),
            version: { increment: 1 },
            ...(orderedItem.id === movingItemId && clientMutationId
              ? { lastClientMutationId: clientMutationId }
              : {})
          }
        })
      )
    );

    return tx.itineraryItem.findMany({
      where: {
        tripId,
        deletedAt: null
      },
      orderBy: itemOrderBy
    });
  }

  private recordClientMutation(
    tx: Prisma.TransactionClient,
    input: ItineraryMutationInput & {
      tripId: string;
      entityType: string;
      entityId: string;
    }
  ) {
    if (!input.clientMutationId) {
      return Promise.resolve();
    }

    return tx.clientMutation.createMany({
      data: [
        {
          tripId: input.tripId,
          actorId: input.actorId,
          clientMutationId: input.clientMutationId,
          entityType: input.entityType,
          entityId: input.entityId,
          operation: input.operation
        }
      ],
      skipDuplicates: true
    });
  }
}

export const itineraryRepository = new ItineraryRepository();
