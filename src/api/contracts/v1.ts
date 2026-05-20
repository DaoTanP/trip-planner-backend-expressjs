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
  createdAt: string;
  updatedAt: string;
};

export type TripResourceResponseDto = {
  trip: TripSummaryDto;
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
  Omit<CreateTripRequestDto, 'preferences' | 'budget'> & {
    status: TripStatusDto;
    coverImageUrl: string | null;
    preferences: Record<string, unknown> | null;
    budget: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
  }
>;

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
      response: ApiSuccessResponse<TripResourceResponseDto>;
    };
    patch: {
      request: UpdateTripRequestDto;
      response: ApiSuccessResponse<TripResourceResponseDto>;
    };
    delete: {
      response: void;
    };
  };
};
