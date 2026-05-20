import type { TripSummaryDto } from '@/api/contracts/index.js';

type TripSummaryRecord = {
  id: string;
  title: string;
  description: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
  timezone: string;
  visibility: TripSummaryDto['visibility'];
  status: TripSummaryDto['status'];
  coverImageUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  destinations?: Array<{ name: string }>;
  _count?: {
    collaborators?: number;
    days?: number;
  };
};

const toDateOnly = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
};

const toIsoString = (value: Date | string): string =>
  typeof value === 'string' ? value : value.toISOString();

export const serializeTripSummary = (trip: TripSummaryRecord): TripSummaryDto => ({
  id: trip.id,
  title: trip.title,
  description: trip.description,
  startDate: toDateOnly(trip.startDate),
  endDate: toDateOnly(trip.endDate),
  timezone: trip.timezone,
  visibility: trip.visibility,
  status: trip.status,
  coverImageUrl: trip.coverImageUrl,
  destinationNames: trip.destinations?.map((destination) => destination.name) ?? [],
  collaboratorCount: trip._count?.collaborators ?? 0,
  itineraryDayCount: trip._count?.days ?? 0,
  createdAt: toIsoString(trip.createdAt),
  updatedAt: toIsoString(trip.updatedAt)
});
