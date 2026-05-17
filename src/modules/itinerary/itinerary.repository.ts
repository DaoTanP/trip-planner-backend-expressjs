import type { Activity, ItineraryDay, Prisma } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

export class ItineraryRepository {
  listDays(tripId: string) {
    return prisma.itineraryDay.findMany({
      where: { tripId },
      orderBy: [{ order: 'asc' }, { date: 'asc' }],
      include: {
        activities: {
          orderBy: { order: 'asc' },
          include: {
            place: true
          }
        }
      }
    });
  }

  createDay(data: Prisma.ItineraryDayUncheckedCreateInput): Promise<ItineraryDay> {
    return prisma.itineraryDay.create({
      data
    });
  }

  findDayTripId(dayId: string): Promise<{ tripId: string } | null> {
    return prisma.itineraryDay.findUnique({
      where: { id: dayId },
      select: { tripId: true }
    });
  }

  createActivity(data: Prisma.ActivityUncheckedCreateInput): Promise<Activity> {
    return prisma.activity.create({
      data
    });
  }

  findActivityTripId(activityId: string): Promise<{ tripId: string } | null> {
    return prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        day: {
          select: {
            tripId: true
          }
        }
      }
    }).then((activity) => (activity ? { tripId: activity.day.tripId } : null));
  }

  updateActivity(id: string, data: Prisma.ActivityUpdateInput): Promise<Activity> {
    return prisma.activity.update({
      where: { id },
      data
    });
  }

  deleteActivity(id: string): Promise<Activity> {
    return prisma.activity.delete({
      where: { id }
    });
  }
}

export const itineraryRepository = new ItineraryRepository();
