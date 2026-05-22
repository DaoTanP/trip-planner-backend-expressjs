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

export type ApiMeta = {
  pagination?: PaginationMeta;
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
export type PlaceSourceDto = 'MANUAL' | 'GOOGLE' | 'MAPBOX' | 'OSM' | 'INTERNAL';
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
  destinationNames: string[];
  collaboratorCount: number;
  itineraryDayCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type TripResourceResponseDto = {
  trip: TripSummaryDto;
};

export type PlaceDto = {
  id: string;
  source: PlaceSourceDto;
  externalId: string | null;
  name: string;
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
  dayId: string;
  placeId: string | null;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  status: ItineraryItemStatusDto;
  cost: number | null;
  currency: string | null;
  durationMinutes: number | null;
  travelMode: string | null;
  travelTimeMinutes: number | null;
  routePolyline: string | null;
  bookingInfo: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  order: number;
  version: number;
  place: PlaceDto | null;
  createdAt: string;
  updatedAt: string;
};

export type TripDayDto = {
  id: string;
  tripId: string;
  date: string;
  title: string | null;
  notes: string | null;
  order: number;
  weatherSnapshot: Record<string, unknown> | null;
  version: number;
  items: ItineraryItemDto[];
  createdAt: string;
  updatedAt: string;
};

export type TripNoteDto = {
  id: string;
  tripId: string;
  authorId: string | null;
  title: string | null;
  body: string;
  order: number;
  pinned: boolean;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type TripCollaboratorDto = {
  id: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  acceptedAt: string | null;
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
  budget: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  collaborators: TripCollaboratorDto[];
  days: TripDayDto[];
  notes: TripNoteDto[];
  places: PlaceDto[];
};

export type TripDetailResourceResponseDto = {
  trip: TripDetailDto;
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
  budget?: Record<string, unknown>;
};

export type UpdateTripRequestDto = Partial<
  Omit<CreateTripRequestDto, 'description' | 'startDate' | 'endDate' | 'preferences' | 'budget'> & {
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    status: TripStatusDto;
    coverImageUrl: string | null;
    preferences: Record<string, unknown> | null;
    budget: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
  }
>;

export type CreateTripDayRequestDto = {
  date: string;
  title?: string;
  notes?: string;
  order?: number;
  weatherSnapshot?: Record<string, unknown>;
};

export type UpdateTripDayRequestDto = Partial<{
  date: string;
  title: string | null;
  notes: string | null;
  order: number;
  weatherSnapshot: Record<string, unknown> | null;
}>;

export type ReorderTripDaysRequestDto = {
  dayIds: string[];
  clientMutationId?: string;
};

export type CreateItineraryItemRequestDto = {
  placeId?: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  status?: ItineraryItemStatusDto;
  cost?: number;
  currency?: string;
  durationMinutes?: number;
  travelMode?: string;
  travelTimeMinutes?: number;
  routePolyline?: string;
  bookingInfo?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  order?: number;
};

export type UpdateItineraryItemRequestDto = Partial<{
  dayId: string;
  placeId: string | null;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  status: ItineraryItemStatusDto;
  cost: number | null;
  currency: string | null;
  durationMinutes: number | null;
  travelMode: string | null;
  travelTimeMinutes: number | null;
  routePolyline: string | null;
  bookingInfo: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  order: number;
}>;

export type ReorderItineraryItemsRequestDto = {
  updates: Array<{
    itemId: string;
    dayId: string;
    order: number;
  }>;
  clientMutationId?: string;
};

export type CreateTripNoteRequestDto = {
  title?: string;
  body: string;
  order?: number;
  pinned?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateTripNoteRequestDto = Partial<{
  title: string | null;
  body: string;
  order: number;
  pinned: boolean;
  metadata: Record<string, unknown> | null;
}>;

export type ListPlacesQueryDto = {
  q?: string;
  countryCode?: string;
  limit?: number;
};

export type SearchPlacesQueryDto = ListPlacesQueryDto & {
  lat?: number;
  lng?: number;
};

export type CreatePlaceRequestDto = {
  source?: PlaceSourceDto;
  externalId?: string;
  name: string;
  formattedAddress?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  websiteUrl?: string;
  phoneNumber?: string;
  timezone?: string;
  categories?: string[];
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
  '/trips/{tripId}/days': {
    get: {
      response: ApiSuccessResponse<{ days: TripDayDto[] }>;
    };
    post: {
      request: CreateTripDayRequestDto;
      response: ApiSuccessResponse<{ day: TripDayDto }>;
    };
  };
  '/trips/{tripId}/days/reorder': {
    patch: {
      request: ReorderTripDaysRequestDto;
      response: ApiSuccessResponse<{ days: TripDayDto[]; clientMutationId?: string }>;
    };
  };
  '/trip-days/{dayId}': {
    patch: {
      request: UpdateTripDayRequestDto;
      response: ApiSuccessResponse<{ day: TripDayDto }>;
    };
    delete: {
      response: void;
    };
  };
  '/trip-days/{dayId}/itinerary-items': {
    post: {
      request: CreateItineraryItemRequestDto;
      response: ApiSuccessResponse<{ item: ItineraryItemDto }>;
    };
  };
  '/itinerary-items/{itemId}': {
    patch: {
      request: UpdateItineraryItemRequestDto;
      response: ApiSuccessResponse<{ item: ItineraryItemDto }>;
    };
    delete: {
      response: void;
    };
  };
  '/trips/{tripId}/itinerary-items/reorder': {
    patch: {
      request: ReorderItineraryItemsRequestDto;
      response: ApiSuccessResponse<{ days: TripDayDto[]; clientMutationId?: string }>;
    };
  };
  '/trips/{tripId}/notes': {
    post: {
      request: CreateTripNoteRequestDto;
      response: ApiSuccessResponse<{ note: TripNoteDto }>;
    };
  };
  '/trip-notes/{noteId}': {
    patch: {
      request: UpdateTripNoteRequestDto;
      response: ApiSuccessResponse<{ note: TripNoteDto }>;
    };
    delete: {
      response: void;
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
