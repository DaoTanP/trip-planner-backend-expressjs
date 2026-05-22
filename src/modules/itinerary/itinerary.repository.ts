import type { ItineraryItem, Prisma, TripDay } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

const dayInclude = {
  items: {
    orderBy: { order: 'asc' },
    include: {
      place: true
    }
  }
} satisfies Prisma.TripDayInclude;

const itemInclude = {
  place: true
} satisfies Prisma.ItineraryItemInclude;

const dayOrderBy = [
  { order: 'asc' },
  { date: 'asc' }
] satisfies Prisma.TripDayOrderByWithRelationInput[];
const spacedOrder = (index: number) => (index + 1) * 1024;

export class ItineraryRepository {
  listDays(tripId: string) {
    return prisma.tripDay.findMany({
      where: { tripId },
      orderBy: dayOrderBy,
      include: dayInclude
    });
  }

  createDay(data: Prisma.TripDayUncheckedCreateInput) {
    return prisma.tripDay.create({
      data,
      include: dayInclude
    });
  }

  findDayTripId(dayId: string): Promise<{ tripId: string } | null> {
    return prisma.tripDay.findUnique({
      where: { id: dayId },
      select: { tripId: true }
    });
  }

  findDayIds(tripId: string): Promise<Array<{ id: string }>> {
    return prisma.tripDay.findMany({
      where: { tripId },
      select: { id: true }
    });
  }

  findTargetDays(tripId: string, dayIds: string[]): Promise<Array<{ id: string }>> {
    return prisma.tripDay.findMany({
      where: {
        tripId,
        id: { in: dayIds }
      },
      select: { id: true }
    });
  }

  updateDay(id: string, data: Prisma.TripDayUpdateInput) {
    return prisma.tripDay.update({
      where: { id },
      data,
      include: dayInclude
    });
  }

  deleteDay(id: string): Promise<TripDay> {
    return prisma.tripDay.delete({
      where: { id }
    });
  }

  reorderDays(tripId: string, dayIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await Promise.all(
        dayIds.map((dayId, index) =>
          tx.tripDay.update({
            where: { id: dayId },
            data: {
              order: spacedOrder(index),
              version: { increment: 1 }
            }
          })
        )
      );

      return tx.tripDay.findMany({
        where: { tripId },
        orderBy: dayOrderBy,
        include: dayInclude
      });
    });
  }

  createItineraryItem(data: Prisma.ItineraryItemUncheckedCreateInput) {
    return prisma.itineraryItem.create({
      data,
      include: itemInclude
    });
  }

  findItineraryItemTripId(itemId: string): Promise<{ tripId: string; dayId: string } | null> {
    return prisma.itineraryItem
      .findUnique({
        where: { id: itemId },
        select: {
          dayId: true,
          day: {
            select: {
              tripId: true
            }
          }
        }
      })
      .then((item) => (item ? { tripId: item.day.tripId, dayId: item.dayId } : null));
  }

  findItineraryItemsForTrip(itemIds: string[]) {
    return prisma.itineraryItem.findMany({
      where: {
        id: { in: itemIds }
      },
      select: {
        id: true,
        day: {
          select: {
            tripId: true
          }
        }
      }
    });
  }

  updateItineraryItem(id: string, data: Prisma.ItineraryItemUpdateInput) {
    return prisma.itineraryItem.update({
      where: { id },
      data,
      include: itemInclude
    });
  }

  deleteItineraryItem(id: string): Promise<ItineraryItem> {
    return prisma.itineraryItem.delete({
      where: { id }
    });
  }

  reorderItineraryItems(
    tripId: string,
    updates: Array<{ itemId: string; dayId: string; order: number }>
  ) {
    return prisma.$transaction(async (tx) => {
      await Promise.all(
        updates.map((update) =>
          tx.itineraryItem.update({
            where: { id: update.itemId },
            data: {
              dayId: update.dayId,
              order: update.order,
              version: { increment: 1 }
            }
          })
        )
      );

      return tx.tripDay.findMany({
        where: { tripId },
        orderBy: dayOrderBy,
        include: dayInclude
      });
    });
  }
}

export const itineraryRepository = new ItineraryRepository();
