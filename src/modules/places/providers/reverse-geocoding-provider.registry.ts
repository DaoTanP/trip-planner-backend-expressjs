import { AppError } from '@/common/errors/app-error.js';
import { env } from '@/config/env.js';
import type { ReverseGeocodingProvider } from '@/modules/places/places.types.js';

import { osmReverseGeocodingProvider } from './osm-reverse-geocoding.provider.js';

export class ReverseGeocodingProviderRegistry {
  constructor(
    private readonly osmProvider: ReverseGeocodingProvider = osmReverseGeocodingProvider
  ) {}

  get(): ReverseGeocodingProvider {
    if (env.PLACES_PROVIDER === 'internal' || env.PLACES_PROVIDER === 'osm') {
      return this.osmProvider;
    }

    throw new AppError({ messageKey: 'errors.places.reverseGeocodeProviderNotConfigured' });
  }
}

export const reverseGeocodingProviderRegistry = new ReverseGeocodingProviderRegistry();
