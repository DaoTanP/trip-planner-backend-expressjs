import { z } from 'zod';

import { AppError } from '@/common/errors/app-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { logger } from '@/common/logger/logger.js';
import { env } from '@/config/env.js';
import type {
  ReverseGeocodeResult,
  ReverseGeocodingProvider
} from '@/modules/places/places.types.js';

const nominatimReverseResponseSchema = z
  .object({
    place_id: z.union([z.number(), z.string()]).optional(),
    osm_type: z.string().optional(),
    osm_id: z.union([z.number(), z.string()]).optional(),
    display_name: z.string().optional(),
    name: z.string().optional(),
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    address: z.record(z.unknown()).optional()
  })
  .passthrough();
const nominatimErrorResponseSchema = z.object({
  error: z.string()
});

const preferredAddressNameFields = [
  'amenity',
  'tourism',
  'shop',
  'leisure',
  'building',
  'road',
  'neighbourhood',
  'suburb',
  'city',
  'town',
  'village',
  'county',
  'state',
  'country'
] as const;

const getStringField = (
  record: Record<string, unknown> | undefined,
  key: string
): string | null => {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const firstAddressName = (address: Record<string, unknown> | undefined): string | null => {
  for (const field of preferredAddressNameFields) {
    const value = getStringField(address, field);
    if (value) {
      return value;
    }
  }

  return null;
};

const firstDisplayNamePart = (displayName: string | undefined): string | null => {
  const firstPart = displayName?.split(',')[0]?.trim();
  return firstPart && firstPart.length > 0 ? firstPart : null;
};

const toProviderPlaceId = (input: {
  osm_type?: string | undefined;
  osm_id?: string | number | undefined;
  place_id?: string | number | undefined;
}): string | null => {
  if (input.osm_type && input.osm_id !== undefined) {
    return `${input.osm_type}:${String(input.osm_id)}`;
  }

  return input.place_id === undefined ? null : String(input.place_id);
};

export class OsmReverseGeocodingProvider implements ReverseGeocodingProvider {
  readonly provider = 'OSM' as const;

  constructor(
    private readonly endpoint: string = env.OSM_REVERSE_GEOCODING_ENDPOINT,
    private readonly fetcher?: typeof globalThis.fetch
  ) {}

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    const url = new URL(this.endpoint);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('extratags', '1');
    url.searchParams.set('namedetails', '1');

    const response = await (this.fetcher ?? globalThis.fetch)(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `${env.APP_NAME}/reverse-geocoding`
      }
    });

    if (response.status === 404) {
      throw new NotFoundError({ resourceKey: 'resources.place' });
    }

    if (!response.ok) {
      logger.warn(
        { status: response.status, provider: this.provider },
        'Reverse geocoding provider request failed'
      );
      throw new AppError({ messageKey: 'errors.places.reverseGeocodeFailed' });
    }

    const payload = await response.json();
    if (nominatimErrorResponseSchema.safeParse(payload).success) {
      throw new NotFoundError({ resourceKey: 'resources.place' });
    }

    const parsed = nominatimReverseResponseSchema.safeParse(payload);
    if (!parsed.success) {
      logger.warn(
        { err: parsed.error, provider: this.provider },
        'Reverse geocoding provider returned an invalid payload'
      );
      throw new AppError({ messageKey: 'errors.places.reverseGeocodeFailed' });
    }

    const address = parsed.data.address;
    const formattedAddress = parsed.data.display_name ?? null;
    const countryCode = getStringField(address, 'country_code')?.toUpperCase() ?? null;
    const providerPayload: Record<string, unknown> = { ...parsed.data };

    return {
      name:
        parsed.data.name ??
        firstAddressName(address) ??
        firstDisplayNamePart(formattedAddress ?? undefined),
      formattedAddress,
      countryCode,
      latitude: parsed.data.lat,
      longitude: parsed.data.lon,
      timezone: null,
      provider: this.provider,
      providerPlaceId: toProviderPlaceId(parsed.data),
      providerPayload
    };
  }
}

export const osmReverseGeocodingProvider = new OsmReverseGeocodingProvider();
