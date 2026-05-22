import type { Prisma } from '@prisma/client';

import { NotFoundError } from '@/common/errors/not-found-error.js';
import { logger } from '@/common/logger/logger.js';
import { cache } from '@/config/redis.js';
import type {
  CreatePlaceInput,
  ListPlacesQuery,
  SearchPlacesQuery
} from '@/modules/places/places.schemas.js';
import { placesRepository, type PlacesRepository } from '@/modules/places/places.repository.js';

export class PlacesService {
  constructor(private readonly repository: PlacesRepository = placesRepository) {}

  async listPlaces(query: ListPlacesQuery) {
    const cacheKey = `places:list:${JSON.stringify(query)}`;
    const filters: { q?: string; countryCode?: string; limit: number } = {
      limit: query.limit
    };

    if (query.q !== undefined) filters.q = query.q;
    if (query.countryCode !== undefined) filters.countryCode = query.countryCode;

    try {
      const cached = await cache.get<Awaited<ReturnType<PlacesRepository['list']>>>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      logger.debug({ err: error }, 'Place cache read skipped');
    }

    const places = await this.repository.list(filters);

    try {
      await cache.set(cacheKey, places, 60);
    } catch (error) {
      logger.debug({ err: error }, 'Place cache write skipped');
    }

    return places;
  }

  searchPlaces(query: SearchPlacesQuery) {
    const filters: ListPlacesQuery = {
      limit: query.limit
    };

    if (query.q !== undefined) filters.q = query.q;
    if (query.countryCode !== undefined) filters.countryCode = query.countryCode;

    return this.listPlaces(filters);
  }

  async getPlace(placeId: string) {
    const place = await this.repository.findById(placeId);
    if (!place) {
      throw new NotFoundError({ resourceKey: 'resources.place' });
    }

    return place;
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
    if (input.websiteUrl !== undefined) data.websiteUrl = input.websiteUrl;
    if (input.phoneNumber !== undefined) data.phoneNumber = input.phoneNumber;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.sourcePayload !== undefined) data.sourcePayload = input.sourcePayload;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    return this.repository.create(data);
  }
}

export const placesService = new PlacesService();
