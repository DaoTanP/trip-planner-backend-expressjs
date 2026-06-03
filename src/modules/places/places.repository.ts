import { Prisma } from '@prisma/client';
import type { Place, PlaceProvider } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

export type PlaceFallbackMatchInput = {
  name: string;
  provider: PlaceProvider;
  providerPlaceId?: string | undefined;
  countryCode?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  formattedAddress?: string | null | undefined;
  address?: string | null | undefined;
};

export type ResolvePlaceResult = {
  place: Place;
  created: boolean;
};

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

  async resolveByProviderPlaceId(
    data: Prisma.PlaceCreateInput,
    provider: PlaceProvider,
    providerPlaceId: string
  ): Promise<ResolvePlaceResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.place.findUnique({
          where: {
            provider_providerPlaceId: {
              provider,
              providerPlaceId
            }
          }
        });

        if (existing) {
          return {
            place: existing,
            created: false
          };
        }

        const place = await tx.place.create({
          data
        });

        return {
          place,
          created: true
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const place = await this.findByProviderPlaceId(provider, providerPlaceId);
        if (place) {
          return {
            place,
            created: false
          };
        }
      }

      throw error;
    }
  }

  findByProviderPlaceId(provider: PlaceProvider, providerPlaceId: string): Promise<Place | null> {
    return prisma.place.findUnique({
      where: {
        provider_providerPlaceId: {
          provider,
          providerPlaceId
        }
      }
    });
  }

  async findFallbackMatch(input: PlaceFallbackMatchInput): Promise<Place | null> {
    if (input.providerPlaceId) {
      const providerMatch = await this.findByProviderPlaceId(input.provider, input.providerPlaceId);
      if (providerMatch) {
        return providerMatch;
      }
    }

    if (
      input.latitude !== undefined &&
      input.latitude !== null &&
      input.longitude !== undefined &&
      input.longitude !== null
    ) {
      const coordinateMatch = await prisma.place.findFirst({
        where: {
          name: {
            equals: input.name,
            mode: 'insensitive'
          },
          latitude: input.latitude,
          longitude: input.longitude,
          ...(input.countryCode ? { countryCode: input.countryCode } : {})
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      if (coordinateMatch) {
        return coordinateMatch;
      }
    }

    const address = input.formattedAddress ?? input.address;
    if (address) {
      return prisma.place.findFirst({
        where: {
          name: {
            equals: input.name,
            mode: 'insensitive'
          },
          ...(input.countryCode ? { countryCode: input.countryCode } : {}),
          OR: [
            {
              formattedAddress: {
                equals: address,
                mode: 'insensitive'
              }
            },
            {
              address: {
                equals: address,
                mode: 'insensitive'
              }
            }
          ]
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
    }

    return null;
  }

  findById(id: string): Promise<Place | null> {
    return prisma.place.findUnique({
      where: { id }
    });
  }
}

export const placesRepository = new PlacesRepository();
