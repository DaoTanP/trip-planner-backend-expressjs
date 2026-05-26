import type { ItineraryItem, Prisma } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

const itemOrderBy = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' }
] satisfies Prisma.ItineraryItemOrderByWithRelationInput[];

const spacedOrder = (index: number) => (index + 1) * 1024;

export class ItineraryRepository {
  listItems(tripId: string) {
    return prisma.itineraryItem.findMany({
      where: {
        tripId,
        deletedAt: null
      },
      orderBy: itemOrderBy
    });
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

  createItineraryItem(data: Prisma.ItineraryItemUncheckedCreateInput) {
    return prisma.itineraryItem.create({
      data
    });
  }

  findLegacyDayTripId(dayId: string): Promise<{ tripId: string } | null> {
    return prisma.tripDay.findUnique({
      where: { id: dayId },
      select: { tripId: true }
    });
  }

  findItineraryItemTripId(itemId: string): Promise<{ tripId: string; version: number } | null> {
    return prisma.itineraryItem.findUnique({
      where: { id: itemId },
      select: {
        tripId: true,
        version: true
      }
    });
  }

  findItineraryItemsForTrip(itemIds: string[]) {
    return prisma.itineraryItem.findMany({
      where: {
        id: { in: itemIds },
        deletedAt: null
      },
      select: {
        id: true,
        tripId: true,
        version: true
      }
    });
  }

  updateItineraryItem(id: string, data: Prisma.ItineraryItemUpdateInput) {
    return prisma.itineraryItem.update({
      where: { id },
      data
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

  reorderItineraryItems(tripId: string, updates: Array<{ itemId: string; sortOrder: number }>) {
    return prisma.$transaction(async (tx) => {
      await Promise.all(
        updates.map((update, index) =>
          tx.itineraryItem.update({
            where: { id: update.itemId },
            data: {
              sortOrder: update.sortOrder || spacedOrder(index),
              version: { increment: 1 }
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
    });
  }
}

export const itineraryRepository = new ItineraryRepository();
