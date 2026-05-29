import type {
  BudgetDto,
  ExpenseCategoryDto,
  ExpenseDto,
  ItineraryItemDto,
  CommentDto,
  MutationEventDto,
  NoteDto,
  PlaceDto,
  RouteSegmentDto,
  TripCollaboratorDto,
  TripDetailDto,
  TripExpensesDto,
  TripSummaryDto
} from '@/api/contracts/index.js';

type DecimalLike = number | string | { toNumber: () => number } | null | undefined;
type JsonRecord = Record<string, unknown> | null;

type PlaceRecord = {
  id: string;
  provider: PlaceDto['provider'];
  providerPlaceId: string | null;
  name: string;
  address?: string | null;
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
  tripId: string;
  placeId: string | null;
  routeSegmentId?: string | null;
  type: ItineraryItemDto['type'];
  title: string;
  description: string | null;
  timezone: string;
  startTime: Date | string | null;
  endTime: Date | string | null;
  isFlexibleTime: boolean;
  isAllDay: boolean;
  sortOrder: number;
  status: ItineraryItemDto['status'];
  cost: DecimalLike;
  currency: string | null;
  durationMinutes?: number | null;
  bookingInfo?: unknown;
  metadata?: unknown;
  version?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
};

type RouteSegmentRecord = {
  id: string;
  tripId: string | null;
  fromPlaceId: string;
  toPlaceId: string;
  provider: RouteSegmentDto['provider'];
  travelMode: string;
  routeProfileHash: string;
  departureTime?: Date | string | null;
  trafficModel?: string | null;
  alternativeIndex?: number;
  polyline: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  metadata?: unknown;
  version?: number;
  expiresAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
};

type NoteRecord = {
  id: string;
  tripId: string | null;
  authorId: string | null;
  parentNoteId?: string | null;
  targetEntityType: NoteDto['targetEntityType'];
  targetEntityId: string;
  body: string;
  mentions?: unknown;
  attachments?: unknown;
  metadata?: unknown;
  version?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  author?: NoteDto['author'];
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
  revision?: bigint | number | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    collaborators?: number;
    itineraryItems?: number;
    notes?: number;
    routeSegments?: number;
  };
};

type TripDetailRecord = TripSummaryRecord & {
  owner: {
    id: string;
    name: string;
    email: string;
  };
  preferences?: unknown;
  metadata?: unknown;
};

type CollaboratorRecord = {
  id: string;
  role: TripCollaboratorDto['role'];
  acceptedAt: Date | string | null;
  version?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  user: TripCollaboratorDto['user'];
};

type BudgetRecord = {
  id: string;
  tripId: string;
  currency: string;
  totalLimit: DecimalLike;
  metadata?: unknown;
  version?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ExpenseCategoryRecord = {
  id: string;
  tripId: string;
  name: string;
  color: string | null;
  sortOrder: number;
  metadata?: unknown;
  version?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
};

type ExpenseRecord = {
  id: string;
  tripId: string;
  budgetId: string | null;
  categoryId: string | null;
  itineraryItemId: string | null;
  title: string;
  amount: DecimalLike;
  currency: string;
  paidByUserId: string | null;
  spentAt: Date | string | null;
  notes: string | null;
  metadata?: unknown;
  version?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
};

type CommentRecord = {
  id: string;
  tripId: string;
  authorId: string;
  targetEntityType: string;
  targetEntityId: string;
  body: string;
  metadata?: unknown;
  version?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
};

type MutationEventRecord = {
  id: string;
  tripId: string;
  actorId: string | null;
  deviceId?: string | null;
  clientMutationId: string | null;
  entityType: string;
  entityId: string | null;
  operation: string;
  payload?: unknown;
  revision: bigint | number | string;
  createdAt: Date | string;
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

const toRevisionString = (value: bigint | number | string | null | undefined): string =>
  value === null || value === undefined ? '0' : value.toString();

const toJsonRecord = (value: unknown): JsonRecord => {
  if (value === null || value === undefined) {
    return null;
  }

  return value as Record<string, unknown>;
};

export const serializePlace = (place: PlaceRecord): PlaceDto => ({
  id: place.id,
  provider: place.provider,
  providerPlaceId: place.providerPlaceId,
  source: place.provider,
  externalId: place.providerPlaceId,
  name: place.name,
  address: place.address ?? null,
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
  tripId: item.tripId,
  placeId: item.placeId,
  type: item.type,
  title: item.title,
  description: item.description,
  timezone: item.timezone,
  startTime: toIsoString(item.startTime),
  endTime: toIsoString(item.endTime),
  isFlexibleTime: item.isFlexibleTime,
  isAllDay: item.isAllDay,
  sortOrder: item.sortOrder,
  routeSegmentId: item.routeSegmentId ?? null,
  status: item.status,
  cost: toNumber(item.cost),
  currency: item.currency,
  durationMinutes: item.durationMinutes ?? null,
  bookingInfo: toJsonRecord(item.bookingInfo),
  metadata: toJsonRecord(item.metadata),
  version: item.version ?? 1,
  createdAt: toIsoString(item.createdAt) ?? '',
  updatedAt: toIsoString(item.updatedAt) ?? '',
  deletedAt: toIsoString(item.deletedAt ?? null)
});

export const serializeRouteSegment = (route: RouteSegmentRecord): RouteSegmentDto => ({
  id: route.id,
  tripId: route.tripId,
  fromPlaceId: route.fromPlaceId,
  toPlaceId: route.toPlaceId,
  provider: route.provider,
  travelMode: route.travelMode,
  routeProfileHash: route.routeProfileHash,
  departureTime: toIsoString(route.departureTime ?? null),
  trafficModel: route.trafficModel ?? null,
  alternativeIndex: route.alternativeIndex ?? 0,
  polyline: route.polyline,
  distanceMeters: route.distanceMeters,
  durationSeconds: route.durationSeconds,
  metadata: toJsonRecord(route.metadata),
  version: route.version ?? 1,
  expiresAt: toIsoString(route.expiresAt ?? null),
  createdAt: toIsoString(route.createdAt) ?? '',
  updatedAt: toIsoString(route.updatedAt) ?? '',
  deletedAt: toIsoString(route.deletedAt ?? null)
});

export const serializeNote = (note: NoteRecord): NoteDto => ({
  id: note.id,
  tripId: note.tripId,
  authorId: note.authorId,
  parentNoteId: note.parentNoteId ?? null,
  targetEntityType: note.targetEntityType,
  targetEntityId: note.targetEntityId,
  body: note.body,
  mentions: note.mentions === undefined ? null : (note.mentions as NoteDto['mentions']),
  attachments: note.attachments === undefined ? null : (note.attachments as NoteDto['attachments']),
  metadata: toJsonRecord(note.metadata),
  version: note.version ?? 1,
  createdAt: toIsoString(note.createdAt) ?? '',
  updatedAt: toIsoString(note.updatedAt) ?? '',
  deletedAt: toIsoString(note.deletedAt ?? null),
  author: note.author ?? null
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
  collaboratorCount: trip._count?.collaborators ?? 0,
  itineraryItemCount: trip._count?.itineraryItems ?? 0,
  noteCount: trip._count?.notes ?? 0,
  routeSegmentCount: trip._count?.routeSegments ?? 0,
  version: trip.version ?? 1,
  revision: toRevisionString(trip.revision),
  createdAt: toIsoString(trip.createdAt) ?? '',
  updatedAt: toIsoString(trip.updatedAt) ?? ''
});

export const serializeTripDetail = (trip: TripDetailRecord): TripDetailDto => ({
  ...serializeTripSummary(trip),
  owner: trip.owner,
  preferences: toJsonRecord(trip.preferences),
  metadata: toJsonRecord(trip.metadata)
});

export const serializeTripCollaborator = (
  collaborator: CollaboratorRecord
): TripCollaboratorDto => ({
  id: collaborator.id,
  role: collaborator.role,
  acceptedAt: toIsoString(collaborator.acceptedAt),
  version: collaborator.version ?? 1,
  createdAt: toIsoString(collaborator.createdAt) ?? '',
  updatedAt: toIsoString(collaborator.updatedAt) ?? '',
  deletedAt: toIsoString(collaborator.deletedAt ?? null),
  user: collaborator.user
});

export const serializeBudget = (budget: BudgetRecord): BudgetDto => ({
  id: budget.id,
  tripId: budget.tripId,
  currency: budget.currency,
  totalLimit: toNumber(budget.totalLimit),
  metadata: toJsonRecord(budget.metadata),
  version: budget.version ?? 1,
  createdAt: toIsoString(budget.createdAt) ?? '',
  updatedAt: toIsoString(budget.updatedAt) ?? ''
});

export const serializeExpenseCategory = (category: ExpenseCategoryRecord): ExpenseCategoryDto => ({
  id: category.id,
  tripId: category.tripId,
  name: category.name,
  color: category.color,
  sortOrder: category.sortOrder,
  metadata: toJsonRecord(category.metadata),
  version: category.version ?? 1,
  createdAt: toIsoString(category.createdAt) ?? '',
  updatedAt: toIsoString(category.updatedAt) ?? '',
  deletedAt: toIsoString(category.deletedAt ?? null)
});

export const serializeExpense = (expense: ExpenseRecord): ExpenseDto => ({
  id: expense.id,
  tripId: expense.tripId,
  budgetId: expense.budgetId,
  categoryId: expense.categoryId,
  itineraryItemId: expense.itineraryItemId,
  title: expense.title,
  amount: toNumber(expense.amount) ?? 0,
  currency: expense.currency,
  paidByUserId: expense.paidByUserId,
  spentAt: toIsoString(expense.spentAt),
  notes: expense.notes,
  metadata: toJsonRecord(expense.metadata),
  version: expense.version ?? 1,
  createdAt: toIsoString(expense.createdAt) ?? '',
  updatedAt: toIsoString(expense.updatedAt) ?? '',
  deletedAt: toIsoString(expense.deletedAt ?? null)
});

export const serializeTripExpenses = (input: {
  budget: BudgetRecord | null;
  categories: ExpenseCategoryRecord[];
  expenses: ExpenseRecord[];
}): TripExpensesDto => ({
  budget: input.budget ? serializeBudget(input.budget) : null,
  categories: input.categories.map(serializeExpenseCategory),
  expenses: input.expenses.map(serializeExpense)
});

export const serializeComment = (comment: CommentRecord): CommentDto => ({
  id: comment.id,
  tripId: comment.tripId,
  authorId: comment.authorId,
  targetEntityType: comment.targetEntityType,
  targetEntityId: comment.targetEntityId,
  body: comment.body,
  metadata: toJsonRecord(comment.metadata),
  version: comment.version ?? 1,
  createdAt: toIsoString(comment.createdAt) ?? '',
  updatedAt: toIsoString(comment.updatedAt) ?? '',
  deletedAt: toIsoString(comment.deletedAt ?? null)
});

export const serializeMutationEvent = (event: MutationEventRecord): MutationEventDto => ({
  id: event.id,
  tripId: event.tripId,
  actorId: event.actorId,
  deviceId: event.deviceId ?? null,
  clientMutationId: event.clientMutationId,
  entityType: event.entityType,
  entityId: event.entityId,
  operation: event.operation,
  payload: toJsonRecord(event.payload),
  revision: toRevisionString(event.revision),
  createdAt: toIsoString(event.createdAt) ?? ''
});
