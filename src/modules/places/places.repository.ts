import type { Place, Prisma } from '@prisma/client';

import { registerCollaborationEntity } from '@/modules/collaboration/collaboration-entity-registry.js';
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
    return prisma.$transaction(async (tx) => {
      const place = await tx.place.create({
        data
      });
      await registerCollaborationEntity(tx, {
        entityType: 'PLACE',
        entityId: place.id
      });

      return place;
    });
  }

  findById(id: string): Promise<Place | null> {
    return prisma.place.findUnique({
      where: { id }
    });
  }
}

export const placesRepository = new PlacesRepository();
