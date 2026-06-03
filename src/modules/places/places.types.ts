export type ReverseGeocodeProviderName = 'OSM' | 'GOOGLE' | 'MAPBOX';

export type ReverseGeocodeResult = {
  name: string | null;
  formattedAddress: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  timezone?: string | null;
  provider: ReverseGeocodeProviderName;
  providerPlaceId?: string | null;
  providerPayload?: Record<string, unknown>;
};

export interface ReverseGeocodingProvider {
  reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult>;
}
