import type { Prisma } from '@prisma/client';
import { PlaceProvider } from '@prisma/client';

import { NotFoundError } from '@/common/errors/not-found-error.js';
import { logger } from '@/common/logger/logger.js';
import { cache } from '@/config/redis.js';
import type {
  CreatePlaceInput,
  ListPlacesQuery,
  ResolvePlaceInput,
  SearchPlacesQuery
} from '@/modules/places/places.schemas.js';
import { placesRepository, type PlacesRepository } from '@/modules/places/places.repository.js';
import {
  reverseGeocodingProviderRegistry,
  type ReverseGeocodingProviderRegistry
} from '@/modules/places/providers/reverse-geocoding-provider.registry.js';

export class PlacesService {
  constructor(
    private readonly repository: PlacesRepository = placesRepository,
    private readonly reverseGeocodingProviders: ReverseGeocodingProviderRegistry = reverseGeocodingProviderRegistry
  ) {}

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

  reverseGeocode(input: { lat: number; lng: number }) {
    return this.reverseGeocodingProviders.get().reverseGeocode(input.lat, input.lng);
  }

  async getPlace(placeId: string) {
    const place = await this.repository.findById(placeId);
    if (!place) {
      throw new NotFoundError({ resourceKey: 'resources.place' });
    }

    return place;
  }

  async resolvePlace(input: ResolvePlaceInput) {
    const providerPlaceId = this.resolveProviderPlaceId(input);
    const data = this.toPlaceCreateData(input);

    if (providerPlaceId) {
      return this.repository.resolveByProviderPlaceId(data, input.provider, providerPlaceId);
    }

    const existing = await this.repository.findFallbackMatch({
      provider: input.provider,
      name: input.name,
      countryCode: input.countryCode,
      latitude: this.normalizeCoordinate(input.latitude),
      longitude: this.normalizeCoordinate(input.longitude),
      formattedAddress: input.formattedAddress,
      address: input.address
    });

    if (existing) {
      return {
        place: existing,
        created: false
      };
    }

    const place = await this.repository.create(data);
    return {
      place,
      created: true
    };
  }

  createPlace(input: CreatePlaceInput) {
    return this.repository.create(this.toPlaceCreateData(input));
  }

  private toPlaceCreateData(input: CreatePlaceInput | ResolvePlaceInput): Prisma.PlaceCreateInput {
    const data: Prisma.PlaceCreateInput = {
      provider: input.provider ?? input.source ?? PlaceProvider.MANUAL,
      name: input.name,
      categories: input.categories
    };

    const providerPlaceId = this.resolveProviderPlaceId(input);
    if (providerPlaceId !== undefined) data.providerPlaceId = providerPlaceId;
    if (input.address !== undefined) data.address = input.address;
    if (input.formattedAddress !== undefined) data.formattedAddress = input.formattedAddress;
    if (input.countryCode !== undefined) data.countryCode = input.countryCode;
    const latitude = this.normalizeCoordinate(input.latitude);
    const longitude = this.normalizeCoordinate(input.longitude);
    if (latitude !== undefined) data.latitude = latitude;
    if (longitude !== undefined) data.longitude = longitude;
    if (input.websiteUrl !== undefined) data.websiteUrl = input.websiteUrl;
    if (input.phoneNumber !== undefined) data.phoneNumber = input.phoneNumber;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.providerPayload !== undefined) data.providerPayload = input.providerPayload;
    if (input.sourcePayload !== undefined) data.providerPayload = input.sourcePayload;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    return data;
  }

  private resolveProviderPlaceId(
    input: Pick<CreatePlaceInput | ResolvePlaceInput, 'providerPlaceId' | 'externalId'>
  ): string | undefined {
    return (
      this.normalizeIdentifier(input.providerPlaceId) ?? this.normalizeIdentifier(input.externalId)
    );
  }

  private normalizeIdentifier(value: string | null | undefined): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeCoordinate(value: number | null | undefined): number | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }

    return Number(value.toFixed(6));
  }
}

export const placesService = new PlacesService();
