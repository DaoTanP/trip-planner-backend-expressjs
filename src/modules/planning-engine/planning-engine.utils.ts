import type { PlanningTravelModeDto } from '@/api/contracts/index.js';
import type { DecimalLike } from '@/modules/planning-intelligence/planning-intelligence.repository.js';
import type { PlannerCoordinate, PlannerItem, PlannerSnapshot } from './planning-engine.types.js';

export const metersPerKilometer = 1000;
export const millisecondsPerMinute = 60_000;
export const millisecondsPerDay = 86_400_000;

const fallbackDurationMinutes = 60;
const defaultDurationByType: Record<string, number> = {
  ACTIVITY: 90,
  LODGING: 45,
  FOOD: 75,
  SHOPPING: 90,
  TRANSPORTATION: 45,
  OTHER: fallbackDurationMinutes
};

export const travelSpeedKmhByMode: Record<PlanningTravelModeDto, number> = {
  walking: 4.5,
  bicycling: 14,
  driving: 38,
  transit: 24,
  mixed: 24
};

export function toNumber(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  const numericValue = value.toNumber();
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function toNullableNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null;
  const numericValue = toNumber(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function getItemCoordinate(item: PlannerItem | undefined): PlannerCoordinate | null {
  const latitude = toNullableNumber(item?.place.latitude);
  const longitude = toNullableNumber(item?.place.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

export function getItemDurationMinutes(item: PlannerItem): number {
  if (typeof item.durationMinutes === 'number' && item.durationMinutes > 0) {
    return item.durationMinutes;
  }

  const matchingType = item.types.find((type) => defaultDurationByType[type] !== undefined);
  return matchingType
    ? (defaultDurationByType[matchingType] ?? fallbackDurationMinutes)
    : fallbackDurationMinutes;
}

export function getItemEndDate(item: PlannerItem): Date | null {
  if (!item.startsAt) {
    return null;
  }

  return new Date(item.startsAt.getTime() + getItemDurationMinutes(item) * millisecondsPerMinute);
}

export function haversineDistanceMeters(
  first: PlannerCoordinate,
  second: PlannerCoordinate
): number {
  const earthRadiusMeters = 6_371_000;
  const lat1 = toRadians(first.latitude);
  const lat2 = toRadians(second.latitude);
  const deltaLat = toRadians(second.latitude - first.latitude);
  const deltaLng = toRadians(second.longitude - first.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateDurationMinutes(distanceMeters: number, travelMode: PlanningTravelModeDto) {
  const speedKmh = travelSpeedKmhByMode[travelMode] ?? travelSpeedKmhByMode.driving;

  return (distanceMeters / metersPerKilometer / speedKmh) * 60;
}

export function getStoredTravelMode(
  trip: PlannerSnapshot,
  fromItemId: string,
  toItemId: string,
  fallback: PlanningTravelModeDto
): PlanningTravelModeDto {
  if (fallback !== 'mixed') {
    return fallback;
  }

  const preference = trip.routePreferences.find(
    (candidate) => candidate.fromItemId === fromItemId && candidate.toItemId === toItemId
  );

  if (
    preference?.travelMode === 'walking' ||
    preference?.travelMode === 'bicycling' ||
    preference?.travelMode === 'transit' ||
    preference?.travelMode === 'driving'
  ) {
    return preference.travelMode;
  }

  return 'driving';
}

export function getDateKey(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function getTripDurationDays(trip: PlannerSnapshot) {
  if (trip.startDate && trip.endDate) {
    return Math.max(
      1,
      Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / millisecondsPerDay) + 1
    );
  }

  const scheduledDates = trip.itineraryItems
    .map((item) => getDateKey(item.startsAt))
    .filter((value): value is string => value !== null);

  return Math.max(1, new Set(scheduledDates).size || 1);
}

export function toPercentage(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

export function round(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function groupBy<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  const result = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;

    const group = result.get(key) ?? [];
    group.push(item);
    result.set(key, group);
  }

  return result;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
