import { prisma } from '@/prisma/client.js';

export class RoutesRepository {
  listForTrip(tripId: string) {
    return prisma.routeSegment.findMany({
      where: {
        OR: [
          { tripId },
          {
            itineraryItems: {
              some: {
                tripId,
                deletedAt: null
              }
            }
          }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}

export const routesRepository = new RoutesRepository();
