import type { Prisma } from '@prisma/client';

import { logger } from '@/common/logger/logger.js';
import { cache } from '@/config/redis.js';
import type { CreatePlaceInput, ListPlacesQuery } from '@/modules/places/places.schemas.js';
import { placesRepository, type PlacesRepository } from '@/modules/places/places.repository.js';

export class PlacesService {
  constructor(private readonly repository: PlacesRepository = placesRepository) {}

  async listPlaces(query: ListPlacesQuery) {
    const cacheKey = `places:list:${JSON.stringify(query)}`;

    try {
      const cached = await cache.get<Awaited<ReturnType<PlacesRepository['list']>>>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.debug({ err: error }, 'Place cache read skipped');
    }

    const places = await this.repository.list(query);

    try {
      await cache.set(cacheKey, places, 60);
    } catch (error) {
      logger.debug({ err: error }, 'Place cache write skipped');
    }

    return places;
  }

  createPlace(input: CreatePlaceInput) {
    const data: Prisma.PlaceCreateInput = {
      source: input.source,
      name: input.name,
      categories: input.categories
    };

    if (input.externalId !== undefined) data.externalId = input.externalId;
    if (input.formattedAddress !== undefined) data.formattedAddress = input.formattedAddress;
    if (input.countryCode !== undefined) data.countryCode = input.countryCode;
    if (input.latitude !== undefined) data.latitude = input.latitude;
    if (input.longitude !== undefined) data.longitude = input.longitude;
    if (input.sourcePayload !== undefined) data.sourcePayload = input.sourcePayload;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    return this.repository.create(data);
  }
}

export const placesService = new PlacesService();
