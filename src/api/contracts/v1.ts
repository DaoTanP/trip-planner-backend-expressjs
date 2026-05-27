export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_FAILED'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_INVALID_SESSION'
  | 'AUTH_MISSING_TOKEN'
  | 'AUTH_MISSING_REFRESH_TOKEN'
  | 'AUTH_REFRESH_TOKEN_EXPIRED'
  | 'AUTH_REFRESH_TOKEN_REUSE_DETECTED'
  | 'AUTH_OAUTH_FAILED'
  | 'AUTH_OAUTH_PROVIDER_NOT_CONFIGURED'
  | 'AUTH_CSRF_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_SERVER_ERROR';

export type ApiValidationIssue = {
  path: string;
  message: string;
  code: string;
  messageKey?: string;
  params?: Record<string, string | number | boolean>;
};

export type ApiErrorPayload = {
  code: ApiErrorCode;
  message: string;
  details?: ApiValidationIssue[] | Record<string, unknown>;
  requestId?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: ApiErrorPayload;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type CursorPaginationMeta = {
  limit: number;
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type ApiMeta = {
  pagination?: PaginationMeta | CursorPaginationMeta;
  requestId?: string;
};

export type ApiSuccessResponse<TData, TMeta extends ApiMeta | undefined = undefined> = {
  success: true;
  data: TData;
} & (TMeta extends undefined ? { meta?: ApiMeta } : { meta: TMeta });

export type ApiResponse<TData, TMeta extends ApiMeta | undefined = undefined> =
  | ApiSuccessResponse<TData, TMeta>
  | ApiErrorResponse;

export type UserRoleDto = 'USER' | 'ADMIN';

export type PublicUserDto = {
  id: string;
  email: string;
  name: string;
  role: UserRoleDto;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  emailVerifiedAt: string | null;
  createdAt: string;
};

export type AuthTokensDto = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type LoginRequestDto = {
  email: string;
  password: string;
  deviceId?: string;
};

export type RegisterRequestDto = {
  email: string;
  password: string;
  name: string;
  locale?: string;
  timezone?: string;
};

export type OAuthLoginRequestDto = {
  credential: string;
  deviceId?: string;
  locale?: string;
  timezone?: string;
};

export type AuthLoginResponseDto = {
  user: PublicUserDto;
  tokens?: AuthTokensDto;
};

export type AuthSessionResponseDto = {
  user: PublicUserDto;
};

export type UpdateProfileRequestDto = {
  name?: string;
  avatarUrl?: string | null;
  locale?: string;
  timezone?: string;
  preferences?: Record<string, unknown>;
};

export type RefreshSessionRequestDto = {
  refreshToken?: string;
  deviceId?: string;
};

export type RefreshSessionResponseDto = {
  tokens?: AuthTokensDto;
};

export type TripStatusDto = 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TripVisibilityDto = 'PRIVATE' | 'SHARED' | 'PUBLIC';
export type PlaceProviderDto = 'MANUAL' | 'GOOGLE' | 'MAPBOX' | 'OSM' | 'INTERNAL';
export type PlaceSourceDto = PlaceProviderDto;
export type RouteProviderDto = 'GOOGLE' | 'MAPBOX' | 'OSM' | 'INTERNAL';
export type ItineraryItemTypeDto =
  | 'ACTIVITY'
  | 'PLACE'
  | 'LODGING'
  | 'TRANSPORT'
  | 'FOOD'
  | 'NOTE'
  | 'TASK'
  | 'CUSTOM';
export type ItineraryItemStatusDto = 'PLANNED' | 'BOOKED' | 'COMPLETED' | 'CANCELLED';

export type TripSummaryDto = {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  timezone: string;
  visibility: TripVisibilityDto;
  status: TripStatusDto;
  coverImageUrl: string | null;
  collaboratorCount: number;
  itineraryItemCount: number;
  noteCount: number;
  routeSegmentCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type TripResourceResponseDto = {
  trip: TripSummaryDto;
};

export type TripCollaboratorDto = {
  id: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  acceptedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
};

export type TripDetailDto = TripSummaryDto & {
  owner: {
    id: string;
    name: string;
    email: string;
  };
  preferences: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

export type TripDetailResourceResponseDto = {
  trip: TripDetailDto;
};

export type PlaceDto = {
  id: string;
  provider: PlaceProviderDto;
  providerPlaceId: string | null;
  source: PlaceSourceDto;
  externalId: string | null;
  name: string;
  address: string | null;
  formattedAddress: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  websiteUrl: string | null;
  phoneNumber: string | null;
  timezone: string | null;
  categories: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ItineraryItemDto = {
  id: string;
  tripId: string;
  placeId: string | null;
  type: ItineraryItemTypeDto;
  title: string;
  description: string | null;
  timezone: string;
  startTime: string | null;
  endTime: string | null;
  isFlexibleTime: boolean;
  isAllDay: boolean;
  sortOrder: number;
  routeSegmentId: string | null;
  status: ItineraryItemStatusDto;
  cost: number | null;
  currency: string | null;
  durationMinutes: number | null;
  bookingInfo: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type RouteSegmentDto = {
  id: string;
  tripId: string | null;
  fromPlaceId: string;
  toPlaceId: string;
  provider: RouteProviderDto;
  travelMode: string;
  routeProfileHash: string;
  polyline: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  metadata: Record<string, unknown> | null;
  version: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type NoteDto = {
  id: string;
  tripId: string;
  authorId: string | null;
  targetEntityType: string;
  targetEntityId: string;
  body: string;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type BudgetDto = {
  id: string;
  tripId: string;
  currency: string;
  totalLimit: number | null;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseCategoryDto = {
  id: string;
  tripId: string;
  name: string;
  color: string | null;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ExpenseDto = {
  id: string;
  tripId: string;
  budgetId: string | null;
  categoryId: string | null;
  itineraryItemId: string | null;
  title: string;
  amount: number;
  currency: string;
  paidByUserId: string | null;
  spentAt: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TripExpensesDto = {
  budget: BudgetDto | null;
  categories: ExpenseCategoryDto[];
  expenses: ExpenseDto[];
};

export type CommentDto = {
  id: string;
  tripId: string;
  authorId: string;
  targetEntityType: string;
  targetEntityId: string;
  body: string;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ListTripsQueryDto = {
  status?: TripStatusDto;
  page?: number;
  limit?: number;
};

export type CreateTripRequestDto = {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  visibility?: TripVisibilityDto;
  preferences?: Record<string, unknown>;
};

export type UpdateTripRequestDto = Partial<
  Omit<CreateTripRequestDto, 'description' | 'startDate' | 'endDate' | 'preferences'> & {
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    status: TripStatusDto;
    coverImageUrl: string | null;
    preferences: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
  }
>;

export type CreateItineraryItemRequestDto = {
  placeId?: string | null;
  type?: ItineraryItemTypeDto;
  title: string;
  description?: string;
  timezone?: string;
  startTime?: string;
  endTime?: string;
  isFlexibleTime?: boolean;
  isAllDay?: boolean;
  sortOrder?: number;
  routeSegmentId?: string | null;
  status?: ItineraryItemStatusDto;
  cost?: number;
  currency?: string;
  durationMinutes?: number;
  bookingInfo?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  clientMutationId?: string;
};

export type UpdateItineraryItemRequestDto = Partial<{
  placeId: string | null;
  type: ItineraryItemTypeDto;
  title: string;
  description: string | null;
  timezone: string;
  startTime: string | null;
  endTime: string | null;
  isFlexibleTime: boolean;
  isAllDay: boolean;
  sortOrder: number;
  routeSegmentId: string | null;
  status: ItineraryItemStatusDto;
  cost: number | null;
  currency: string | null;
  durationMinutes: number | null;
  bookingInfo: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  expectedVersion: number;
  clientMutationId: string;
}>;

export type ReorderItineraryItemsRequestDto = {
  itemId: string;
  beforeItemId?: string | null;
  afterItemId?: string | null;
  expectedVersion?: number;
  clientMutationId?: string;
};

export type ReorderItineraryItemsResponseDto = {
  item: ItineraryItemDto;
  affectedItems?: ItineraryItemDto[];
  clientMutationId?: string;
};

export type CreateNoteRequestDto = {
  targetEntityType?: string;
  targetEntityId?: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  clientMutationId?: string;
};

export type UpdateNoteRequestDto = Partial<{
  body: string;
  metadata: Record<string, unknown> | null;
  expectedVersion: number;
  clientMutationId: string;
}>;

export type ListPlacesQueryDto = {
  q?: string;
  countryCode?: string;
  limit?: number;
};

export type CursorListQueryDto = {
  cursor?: string;
  limit?: number;
};

export type ListNotesQueryDto = CursorListQueryDto & {
  targetEntityType?: string;
  targetEntityId?: string;
};

export type ListCommentsQueryDto = CursorListQueryDto & {
  targetEntityType?: string;
  targetEntityId?: string;
};

export type SearchPlacesQueryDto = ListPlacesQueryDto & {
  lat?: number;
  lng?: number;
};

export type CreatePlaceRequestDto = {
  provider?: PlaceProviderDto;
  providerPlaceId?: string;
  source?: PlaceSourceDto;
  externalId?: string;
  name: string;
  address?: string;
  formattedAddress?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  websiteUrl?: string;
  phoneNumber?: string;
  timezone?: string;
  categories?: string[];
  providerPayload?: Record<string, unknown>;
  sourcePayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type ApiV1Paths = {
  '/auth/login': {
    post: {
      request: LoginRequestDto;
      response: ApiSuccessResponse<AuthLoginResponseDto>;
    };
  };
  '/auth/register': {
    post: {
      request: RegisterRequestDto;
      response: ApiSuccessResponse<AuthLoginResponseDto>;
    };
  };
  '/auth/oauth/google': {
    post: {
      request: OAuthLoginRequestDto;
      response: ApiSuccessResponse<AuthLoginResponseDto>;
    };
  };
  '/auth/me': {
    get: {
      response: ApiSuccessResponse<AuthSessionResponseDto>;
    };
  };
  '/auth/refresh': {
    post: {
      request: RefreshSessionRequestDto;
      response: ApiSuccessResponse<RefreshSessionResponseDto>;
    };
  };
  '/auth/logout': {
    post: {
      request: { refreshToken?: string };
      response: void;
    };
  };
  '/users/me': {
    get: {
      response: ApiSuccessResponse<AuthSessionResponseDto>;
    };
    patch: {
      request: UpdateProfileRequestDto;
      response: ApiSuccessResponse<AuthSessionResponseDto>;
    };
  };
  '/trips': {
    get: {
      query: ListTripsQueryDto;
      response: ApiSuccessResponse<TripSummaryDto[], { pagination: PaginationMeta }>;
    };
    post: {
      request: CreateTripRequestDto;
      response: ApiSuccessResponse<TripResourceResponseDto>;
    };
  };
  '/trips/{tripId}': {
    get: {
      response: ApiSuccessResponse<TripDetailResourceResponseDto>;
    };
    patch: {
      request: UpdateTripRequestDto;
      response: ApiSuccessResponse<TripDetailResourceResponseDto>;
    };
    delete: {
      response: void;
    };
  };
  '/trips/{tripId}/itinerary': {
    get: {
      query: CursorListQueryDto;
      response: ApiSuccessResponse<
        { items: ItineraryItemDto[] },
        { pagination: CursorPaginationMeta }
      >;
    };
    post: {
      request: CreateItineraryItemRequestDto;
      response: ApiSuccessResponse<{ item: ItineraryItemDto; clientMutationId?: string }>;
    };
  };
  '/trips/{tripId}/itinerary/reorder': {
    patch: {
      request: ReorderItineraryItemsRequestDto;
      response: ApiSuccessResponse<ReorderItineraryItemsResponseDto>;
    };
  };
  '/itinerary-items/{itemId}': {
    patch: {
      request: UpdateItineraryItemRequestDto;
      response: ApiSuccessResponse<{ item: ItineraryItemDto; clientMutationId?: string }>;
    };
    delete: {
      response: void;
    };
  };
  '/trips/{tripId}/places': {
    get: {
      response: ApiSuccessResponse<{ places: PlaceDto[] }>;
    };
  };
  '/trips/{tripId}/notes': {
    get: {
      query: ListNotesQueryDto;
      response: ApiSuccessResponse<{ notes: NoteDto[] }, { pagination: CursorPaginationMeta }>;
    };
    post: {
      request: CreateNoteRequestDto;
      response: ApiSuccessResponse<{ note: NoteDto; clientMutationId?: string }>;
    };
  };
  '/notes/{noteId}': {
    patch: {
      request: UpdateNoteRequestDto;
      response: ApiSuccessResponse<{ note: NoteDto; clientMutationId?: string }>;
    };
    delete: {
      response: void;
    };
  };
  '/trips/{tripId}/routes': {
    get: {
      query: CursorListQueryDto;
      response: ApiSuccessResponse<
        { routes: RouteSegmentDto[] },
        { pagination: CursorPaginationMeta }
      >;
    };
  };
  '/trips/{tripId}/collaborators': {
    get: {
      response: ApiSuccessResponse<{ collaborators: TripCollaboratorDto[] }>;
    };
  };
  '/trips/{tripId}/expenses': {
    get: {
      query: CursorListQueryDto;
      response: ApiSuccessResponse<TripExpensesDto, { pagination: CursorPaginationMeta }>;
    };
  };
  '/trips/{tripId}/comments': {
    get: {
      query: ListCommentsQueryDto;
      response: ApiSuccessResponse<
        { comments: CommentDto[] },
        { pagination: CursorPaginationMeta }
      >;
    };
  };
  '/places': {
    get: {
      query: ListPlacesQueryDto;
      response: ApiSuccessResponse<{ places: PlaceDto[] }>;
    };
    post: {
      request: CreatePlaceRequestDto;
      response: ApiSuccessResponse<{ place: PlaceDto }>;
    };
  };
  '/places/search': {
    get: {
      query: SearchPlacesQueryDto;
      response: ApiSuccessResponse<{ places: PlaceDto[] }>;
    };
  };
  '/places/{placeId}': {
    get: {
      response: ApiSuccessResponse<{ place: PlaceDto }>;
    };
  };
};
