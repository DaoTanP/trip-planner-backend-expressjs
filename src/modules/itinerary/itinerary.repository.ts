import type { ItineraryItem, Prisma } from '@prisma/client';

import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  type CursorPage
} from '@/common/utils/cursor-pagination.js';
import {
  getMidpointSortOrder,
  itineraryItemOrderBy,
  itineraryOrderStride,
  isBeforeInItineraryOrder,
  spacedItineraryOrder
} from '@/modules/itinerary/itinerary-ordering.js';
import {
  appendMutationEvent,
  createEntityPatchPayload,
  syncOperations
} from '@/modules/sync/mutation-event-log.js';
import { prisma } from '@/prisma/client.js';

type SortOrderCursor = {
  sortOrder: number;
  id: string;
};

type ItineraryMutationInput = {
  actorId: string;
  deviceId?: string | undefined;
  clientMutationId?: string | undefined;
};

type ReorderInput = {
  itemId: string;
  beforeItemId?: string | null | undefined;
  afterItemId?: string | null | undefined;
  expectedVersion?: number | undefined;
  clientMutationId?: string | undefined;
  deviceId?: string | undefined;
  actorId: string;
};

type CreatePositionInput = {
  beforeItemId?: string | null | undefined;
  afterItemId?: string | null | undefined;
};

type ItineraryMutationResult = {
  item: ItineraryItem;
  revision: bigint;
};

type ItineraryCreateResult = {
  item: ItineraryItem | null;
  affectedItems: ItineraryItem[];
  revision: bigint | null;
};

type ItineraryReorderResult = {
  item: ItineraryItem | null;
  affectedItems: ItineraryItem[];
  revision: bigint | null;
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

const itineraryItemPatchFields = (item: ItineraryItem): Prisma.InputJsonObject => ({
  id: item.id,
  tripId: item.tripId,
  placeId: item.placeId,
  types: item.types,
  summary: item.summary,
  sortOrder: item.sortOrder,
  startsAt: item.startsAt?.toISOString() ?? null,
  durationMinutes: item.durationMinutes,
  status: item.status,
  metadata: item.metadata as Prisma.InputJsonValue | null,
  timezone: item.timezone,
  version: item.version,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
  deletedAt: item.deletedAt?.toISOString() ?? null
});

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
      orderBy: itineraryItemOrderBy,
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
    mutation: ItineraryMutationInput,
    position: CreatePositionInput = {}
  ): Promise<ItineraryCreateResult> {
    return prisma.$transaction(async (tx) => {
      const createData = { ...data };
      const hasRelativePosition = Boolean(position.beforeItemId || position.afterItemId);

      if (!hasRelativePosition) {
        if (createData.sortOrder === undefined) {
          const maxSortOrder = await tx.itineraryItem.aggregate({
            where: {
              tripId: createData.tripId,
              deletedAt: null
            },
            _max: {
              sortOrder: true
            }
          });

          createData.sortOrder = (maxSortOrder._max.sortOrder ?? 0) + itineraryOrderStride;
        }

        const item = await tx.itineraryItem.create({
          data: createData
        });
        const revision = await this.appendCreateMutationEvent(tx, item, mutation);

        return { item, affectedItems: [item], revision };
      }

      const neighbors = await tx.itineraryItem.findMany({
        where: {
          tripId: createData.tripId,
          deletedAt: null,
          id: {
            in: [position.beforeItemId, position.afterItemId].filter(Boolean) as string[]
          }
        },
        select: {
          id: true,
          sortOrder: true
        }
      });

      const before = position.beforeItemId
        ? neighbors.find((neighbor) => neighbor.id === position.beforeItemId)
        : null;
      const after = position.afterItemId
        ? neighbors.find((neighbor) => neighbor.id === position.afterItemId)
        : null;

      if (
        (position.beforeItemId && !before) ||
        (position.afterItemId && !after) ||
        (before && after && !isBeforeInItineraryOrder(after, before))
      ) {
        return { item: null, affectedItems: [], revision: null };
      }

      const targetWindow = await this.resolveInsertionWindow(tx, createData.tripId, before, after);
      const nextSortOrder = getMidpointSortOrder(
        targetWindow.lowerSortOrder,
        targetWindow.upperSortOrder
      );

      if (nextSortOrder !== null) {
        createData.sortOrder = nextSortOrder;
        const item = await tx.itineraryItem.create({
          data: createData
        });
        const revision = await this.appendCreateMutationEvent(tx, item, mutation, {
          beforeItemId: position.beforeItemId ?? null,
          afterItemId: position.afterItemId ?? null
        });

        return { item, affectedItems: [item], revision };
      }

      const item = await tx.itineraryItem.create({
        data: {
          ...createData,
          sortOrder: 0
        }
      });
      const affectedItems = await this.rebalanceAroundInsertion(
        tx,
        item.tripId,
        item.id,
        before?.id,
        after?.id,
        mutation.clientMutationId
      );
      const rebalancedItem = affectedItems.find((candidate) => candidate.id === item.id) ?? null;
      if (!rebalancedItem) {
        return { item: null, affectedItems: [], revision: null };
      }
      const revision = await this.appendCreateMutationEvent(tx, rebalancedItem, mutation, {
        beforeItemId: position.beforeItemId ?? null,
        afterItemId: position.afterItemId ?? null,
        affectedItems: affectedItems.map((candidate) => ({
          id: candidate.id,
          sortOrder: candidate.sortOrder,
          version: candidate.version,
          updatedAt: candidate.updatedAt.toISOString()
        }))
      });

      return { item: rebalancedItem, affectedItems, revision };
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

  findItineraryItemById(itemId: string): Promise<ItineraryItem | null> {
    return prisma.itineraryItem.findUnique({
      where: { id: itemId }
    });
  }

  updateItineraryItem(
    id: string,
    data: Prisma.ItineraryItemUpdateInput,
    mutation: ItineraryMutationInput & { tripId: string }
  ): Promise<ItineraryMutationResult> {
    return prisma.$transaction(async (tx) => {
      const item = await tx.itineraryItem.update({
        where: { id },
        data
      });
      const revision = await appendMutationEvent(tx, {
        ...mutation,
        entityType: 'ITINERARY_ITEM',
        entityId: item.id,
        operation: syncOperations.updated,
        payload: createEntityPatchPayload({
          patchType: syncOperations.updated,
          entityType: 'ITINERARY_ITEM',
          entityId: item.id,
          fields: itineraryItemPatchFields(item)
        })
      });

      return { item, revision };
    });
  }

  softDeleteItineraryItem(
    id: string,
    mutation: ItineraryMutationInput & { tripId: string }
  ): Promise<ItineraryMutationResult> {
    return prisma.$transaction(async (tx) => {
      const item = await tx.itineraryItem.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          version: { increment: 1 },
          ...(mutation.clientMutationId ? { lastClientMutationId: mutation.clientMutationId } : {})
        }
      });
      await tx.tripRoutePreference.deleteMany({
        where: {
          tripId: mutation.tripId,
          OR: [{ fromItemId: id }, { toItemId: id }]
        }
      });
      const revision = await appendMutationEvent(tx, {
        ...mutation,
        entityType: 'ITINERARY_ITEM',
        entityId: item.id,
        operation: syncOperations.deleted,
        payload: createEntityPatchPayload({
          patchType: syncOperations.deleted,
          entityType: 'ITINERARY_ITEM',
          entityId: item.id,
          tombstone: {
            id: item.id,
            tripId: item.tripId,
            version: item.version,
            deletedAt: item.deletedAt?.toISOString() ?? null
          }
        })
      });

      return { item, revision };
    });
  }

  reorderItineraryItem(tripId: string, input: ReorderInput): Promise<ItineraryReorderResult> {
    return prisma.$transaction(async (tx) => {
      const item = await tx.itineraryItem.findFirst({
        where: {
          id: input.itemId,
          tripId,
          deletedAt: null
        }
      });

      if (!item) {
        return { item: null, affectedItems: [], revision: null };
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
        return { item: null, affectedItems: [], revision: null };
      }

      const position = await this.resolveTargetWindow(tx, tripId, item.id, before, after);
      const nextSortOrder = getMidpointSortOrder(position.lowerSortOrder, position.upperSortOrder);

      if (nextSortOrder !== null) {
        const updated = await tx.itineraryItem.update({
          where: { id: item.id },
          data: {
            sortOrder: nextSortOrder,
            version: { increment: 1 },
            ...(input.clientMutationId ? { lastClientMutationId: input.clientMutationId } : {})
          }
        });
        const revision = await appendMutationEvent(tx, {
          tripId,
          actorId: input.actorId,
          deviceId: input.deviceId,
          clientMutationId: input.clientMutationId,
          entityType: 'ITINERARY_ITEM',
          entityId: item.id,
          operation: syncOperations.moved,
          payload: createEntityPatchPayload({
            patchType: syncOperations.moved,
            entityType: 'ITINERARY_ITEM',
            entityId: item.id,
            fields: {
              id: item.id,
              tripId,
              beforeItemId: input.beforeItemId ?? null,
              afterItemId: input.afterItemId ?? null,
              sortOrder: updated.sortOrder,
              version: updated.version,
              updatedAt: updated.updatedAt.toISOString()
            }
          })
        });

        return { item: updated, affectedItems: [updated], revision };
      }

      const rebalanced = await this.rebalanceAroundMove(
        tx,
        tripId,
        item.id,
        before?.id,
        after?.id,
        input.clientMutationId
      );
      const revision = await appendMutationEvent(tx, {
        tripId,
        actorId: input.actorId,
        deviceId: input.deviceId,
        clientMutationId: input.clientMutationId,
        entityType: 'ITINERARY_ITEM',
        entityId: item.id,
        operation: syncOperations.rebalanced,
        payload: createEntityPatchPayload({
          patchType: syncOperations.rebalanced,
          entityType: 'ITINERARY_ITEM',
          entityId: item.id,
          fields: {
            itemId: item.id,
            beforeItemId: input.beforeItemId ?? null,
            afterItemId: input.afterItemId ?? null,
            affectedItems: rebalanced.map((candidate) => ({
              id: candidate.id,
              sortOrder: candidate.sortOrder,
              version: candidate.version,
              updatedAt: candidate.updatedAt.toISOString()
            }))
          }
        })
      });

      return {
        item: rebalanced.find((candidate) => candidate.id === item.id) ?? null,
        affectedItems: rebalanced,
        revision
      };
    });
  }

  private appendCreateMutationEvent(
    tx: Prisma.TransactionClient,
    item: ItineraryItem,
    mutation: ItineraryMutationInput,
    context?: Prisma.InputJsonObject
  ): Promise<bigint> {
    const fields: Prisma.InputJsonObject = {
      ...itineraryItemPatchFields(item),
      ...(context ?? {})
    };

    return appendMutationEvent(tx, {
      ...mutation,
      tripId: item.tripId,
      entityType: 'ITINERARY_ITEM',
      entityId: item.id,
      operation: syncOperations.created,
      payload: createEntityPatchPayload({
        patchType: syncOperations.created,
        entityType: 'ITINERARY_ITEM',
        entityId: item.id,
        fields
      })
    });
  }

  private async resolveInsertionWindow(
    tx: Prisma.TransactionClient,
    tripId: string,
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
          sortOrder: { gt: after.sortOrder }
        },
        orderBy: itineraryItemOrderBy,
        select: { sortOrder: true }
      });

      return {
        lowerSortOrder: after.sortOrder,
        upperSortOrder: next?.sortOrder ?? after.sortOrder + itineraryOrderStride * 2
      };
    }

    const maxSortOrder = await tx.itineraryItem.aggregate({
      where: {
        tripId,
        deletedAt: null
      },
      _max: {
        sortOrder: true
      }
    });

    const lowerSortOrder = maxSortOrder._max.sortOrder ?? 0;
    return {
      lowerSortOrder,
      upperSortOrder: lowerSortOrder + itineraryOrderStride * 2
    };
  }

  private async rebalanceAroundInsertion(
    tx: Prisma.TransactionClient,
    tripId: string,
    insertedItemId: string,
    beforeItemId?: string,
    afterItemId?: string,
    clientMutationId?: string
  ): Promise<ItineraryItem[]> {
    const items = await tx.itineraryItem.findMany({
      where: {
        tripId,
        deletedAt: null
      },
      orderBy: itineraryItemOrderBy
    });
    const insertedItem = items.find((item) => item.id === insertedItemId);
    if (!insertedItem) {
      return [];
    }

    const orderedItems = items.filter((item) => item.id !== insertedItemId);
    const targetIndex =
      beforeItemId !== undefined
        ? orderedItems.findIndex((item) => item.id === beforeItemId)
        : afterItemId !== undefined
          ? orderedItems.findIndex((item) => item.id === afterItemId) + 1
          : orderedItems.length;

    orderedItems.splice(Math.max(targetIndex, 0), 0, insertedItem);

    await Promise.all(
      orderedItems.map((orderedItem, index) => {
        const data: Prisma.ItineraryItemUpdateInput = {
          sortOrder: spacedItineraryOrder(index)
        };

        if (orderedItem.id !== insertedItemId) {
          data.version = { increment: 1 };
        }
        if (orderedItem.id === insertedItemId && clientMutationId) {
          data.lastClientMutationId = clientMutationId;
        }

        return tx.itineraryItem.update({
          where: { id: orderedItem.id },
          data
        });
      })
    );

    return tx.itineraryItem.findMany({
      where: {
        tripId,
        deletedAt: null
      },
      orderBy: itineraryItemOrderBy
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
        orderBy: itineraryItemOrderBy,
        select: { sortOrder: true }
      });

      return {
        lowerSortOrder: after.sortOrder,
        upperSortOrder: next?.sortOrder ?? after.sortOrder + itineraryOrderStride * 2
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
      upperSortOrder: lowerSortOrder + itineraryOrderStride * 2
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
      orderBy: itineraryItemOrderBy
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
            sortOrder: spacedItineraryOrder(index),
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
      orderBy: itineraryItemOrderBy
    });
  }
}

export const itineraryRepository = new ItineraryRepository();
