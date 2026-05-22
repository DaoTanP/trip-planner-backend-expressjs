import type {
  ItineraryItemDto,
  PlaceDto,
  TripDayDto,
  TripDetailDto,
  TripNoteDto,
  TripSummaryDto
} from '@/api/contracts/index.js';

type DecimalLike = number | string | { toNumber: () => number } | null | undefined;
type JsonRecord = Record<string, unknown> | null;

type PlaceRecord = {
  id: string;
  source: PlaceDto['source'];
  externalId: string | null;
  name: string;
  formattedAddress: string | null;
  countryCode: string | null;
  latitude: DecimalLike;
  longitude: DecimalLike;
  websiteUrl?: string | null;
  phoneNumber?: string | null;
  timezone?: string | null;
  categories: string[];
  metadata?: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ItineraryItemRecord = {
  id: string;
  dayId: string;
  placeId: string | null;
  title: string;
  description: string | null;
  startTime: Date | string | null;
  endTime: Date | string | null;
  timezone: string;
  status: ItineraryItemDto['status'];
  cost: DecimalLike;
  currency: string | null;
  durationMinutes?: number | null;
  travelMode?: string | null;
  travelTimeMinutes?: number | null;
  routePolyline?: string | null;
  bookingInfo?: unknown;
  metadata?: unknown;
  order: number;
  version?: number;
  place?: PlaceRecord | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type TripDayRecord = {
  id: string;
  tripId: string;
  date: Date | string;
  title: string | null;
  notes: string | null;
  order: number;
  weatherSnapshot?: unknown;
  version?: number;
  items?: ItineraryItemRecord[];
  createdAt: Date | string;
  updatedAt: Date | string;
};

type TripNoteRecord = {
  id: string;
  tripId: string;
  authorId: string | null;
  title: string | null;
  body: string;
  order: number;
  pinned: boolean;
  metadata?: unknown;
  version?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

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
  version?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  destinations?: Array<{ name: string }>;
  _count?: {
    collaborators?: number;
    days?: number;
  };
};

type TripDetailRecord = TripSummaryRecord & {
  owner: {
    id: string;
    name: string;
    email: string;
  };
  preferences?: unknown;
  budget?: unknown;
  metadata?: unknown;
  collaborators?: Array<{
    id: string;
    role: 'OWNER' | 'EDITOR' | 'VIEWER';
    acceptedAt: Date | string | null;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    } | null;
  }>;
  days?: TripDayRecord[];
  notes?: TripNoteRecord[];
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

const toIsoString = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.toISOString();
};

const toNumber = (value: DecimalLike): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return value.toNumber();
};

const toJsonRecord = (value: unknown): JsonRecord => {
  if (value === null || value === undefined) {
    return null;
  }

  return value as Record<string, unknown>;
};

export const serializePlace = (place: PlaceRecord): PlaceDto => ({
  id: place.id,
  source: place.source,
  externalId: place.externalId,
  name: place.name,
  formattedAddress: place.formattedAddress,
  countryCode: place.countryCode,
  latitude: toNumber(place.latitude),
  longitude: toNumber(place.longitude),
  websiteUrl: place.websiteUrl ?? null,
  phoneNumber: place.phoneNumber ?? null,
  timezone: place.timezone ?? null,
  categories: place.categories,
  metadata: toJsonRecord(place.metadata),
  createdAt: toIsoString(place.createdAt) ?? '',
  updatedAt: toIsoString(place.updatedAt) ?? ''
});

export const serializeItineraryItem = (item: ItineraryItemRecord): ItineraryItemDto => ({
  id: item.id,
  dayId: item.dayId,
  placeId: item.placeId,
  title: item.title,
  description: item.description,
  startTime: toIsoString(item.startTime),
  endTime: toIsoString(item.endTime),
  timezone: item.timezone,
  status: item.status,
  cost: toNumber(item.cost),
  currency: item.currency,
  durationMinutes: item.durationMinutes ?? null,
  travelMode: item.travelMode ?? null,
  travelTimeMinutes: item.travelTimeMinutes ?? null,
  routePolyline: item.routePolyline ?? null,
  bookingInfo: toJsonRecord(item.bookingInfo),
  metadata: toJsonRecord(item.metadata),
  order: item.order,
  version: item.version ?? 1,
  place: item.place ? serializePlace(item.place) : null,
  createdAt: toIsoString(item.createdAt) ?? '',
  updatedAt: toIsoString(item.updatedAt) ?? ''
});

export const serializeTripDay = (day: TripDayRecord): TripDayDto => ({
  id: day.id,
  tripId: day.tripId,
  date: toDateOnly(day.date) ?? '',
  title: day.title,
  notes: day.notes,
  order: day.order,
  weatherSnapshot: toJsonRecord(day.weatherSnapshot),
  version: day.version ?? 1,
  items: day.items?.map(serializeItineraryItem) ?? [],
  createdAt: toIsoString(day.createdAt) ?? '',
  updatedAt: toIsoString(day.updatedAt) ?? ''
});

export const serializeTripNote = (note: TripNoteRecord): TripNoteDto => ({
  id: note.id,
  tripId: note.tripId,
  authorId: note.authorId,
  title: note.title,
  body: note.body,
  order: note.order,
  pinned: note.pinned,
  metadata: toJsonRecord(note.metadata),
  version: note.version ?? 1,
  createdAt: toIsoString(note.createdAt) ?? '',
  updatedAt: toIsoString(note.updatedAt) ?? ''
});

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
  version: trip.version ?? 1,
  createdAt: toIsoString(trip.createdAt) ?? '',
  updatedAt: toIsoString(trip.updatedAt) ?? ''
});

export const serializeTripDetail = (trip: TripDetailRecord): TripDetailDto => {
  const days = trip.days?.map(serializeTripDay) ?? [];
  const placeMap = new Map<string, PlaceDto>();

  for (const day of days) {
    for (const item of day.items) {
      if (item.place) {
        placeMap.set(item.place.id, item.place);
      }
    }
  }

  return {
    ...serializeTripSummary({
      ...trip,
      _count: {
        collaborators: trip.collaborators?.length ?? trip._count?.collaborators ?? 0,
        days: trip.days?.length ?? trip._count?.days ?? 0
      }
    }),
    owner: trip.owner,
    preferences: toJsonRecord(trip.preferences),
    budget: toJsonRecord(trip.budget),
    metadata: toJsonRecord(trip.metadata),
    collaborators:
      trip.collaborators?.map((collaborator) => ({
        id: collaborator.id,
        role: collaborator.role,
        acceptedAt: toIsoString(collaborator.acceptedAt),
        user: collaborator.user
      })) ?? [],
    days,
    notes: trip.notes?.map(serializeTripNote) ?? [],
    places: Array.from(placeMap.values())
  };
};
