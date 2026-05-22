import type { Place, Prisma } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

export class PlacesRepository {
  list(filters: { q?: string; countryCode?: string; limit: number }): Promise<Place[]> {
    return prisma.place.findMany({
      where: {
        ...(filters.q
          ? {
              name: {
                contains: filters.q,
                mode: 'insensitive'
              }
            }
          : {}),
        ...(filters.countryCode ? { countryCode: filters.countryCode } : {})
      },
      orderBy: { name: 'asc' },
      take: filters.limit
    });
  }

  create(data: Prisma.PlaceCreateInput): Promise<Place> {
    return prisma.place.create({
      data
    });
  }

  findById(id: string): Promise<Place | null> {
    return prisma.place.findUnique({
      where: { id }
    });
  }
}

export const placesRepository = new PlacesRepository();
