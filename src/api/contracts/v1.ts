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
  | 'REVISION_CONFLICT'
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
  cursorVersion: number;
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
export type ReverseGeocodeProviderDto = 'OSM' | 'GOOGLE' | 'MAPBOX';
export type NoteTargetEntityTypeDto = 'TRIP' | 'ITINERARY_ITEM' | 'EXPENSE' | 'PLACE';
export type ItineraryItemTypeDto =
  | 'ACTIVITY'
  | 'LODGING'
  | 'FOOD'
  | 'SHOPPING'
  | 'TRANSPORTATION'
  | 'OTHER';
export type ItineraryItemStatusDto = 'PLANNED' | 'BOOKED' | 'COMPLETED' | 'CANCELLED';
export type RouteTravelModeDto = 'driving' | 'walking' | 'bicycling' | 'transit';
export type PlanningTravelModeDto = RouteTravelModeDto | 'mixed';
export type PlanningOptimizationStrategyDto =
  | 'SHORTEST_DISTANCE'
  | 'SHORTEST_TIME'
  | 'WALKING'
  | 'DRIVING'
  | 'PUBLIC_TRANSPORT'
  | 'MIXED';
export type PlanningIssueSeverityDto = 'INFO' | 'WARNING' | 'CRITICAL';
export type PlanningIssueCategoryDto =
  | 'ITINERARY'
  | 'ROUTE'
  | 'SCHEDULE'
  | 'MAP'
  | 'BUDGET'
  | 'COLLABORATION';
export type PlanningInsightEntityTypeDto =
  | 'TRIP'
  | 'ITINERARY_ITEM'
  | 'PLACE'
  | 'EXPENSE'
  | 'BUDGET'
  | 'NOTE'
  | 'COLLABORATOR'
  | 'ROUTE';

export type PlanningIssueDto = {
  id: string;
  code: string;
  category: PlanningIssueCategoryDto;
  severity: PlanningIssueSeverityDto;
  entityType: PlanningInsightEntityTypeDto;
  entityId: string | null;
  relatedEntityIds: string[];
  messageKey: string;
  params: Record<string, string | number | boolean>;
  confidence: number;
};

export type PlanningScoreDimensionDto = {
  key:
    | 'scheduleCompleteness'
    | 'travelEfficiency'
    | 'budgetHealth'
    | 'collaborationCompleteness'
    | 'itineraryConsistency';
  score: number;
  maxScore: number;
  explanationKey: string;
  signals: string[];
};

export type PlanningScoreDto = {
  overall: number;
  maxScore: number;
  dimensions: PlanningScoreDimensionDto[];
  explanationKey: string;
};

export type PlanningOptimizationStepDto = {
  itemId: string;
  placeId: string;
  sequence: number;
  recommendedSequence: number;
  distanceFromPreviousMeters: number | null;
  durationFromPreviousMinutes: number | null;
};

export type PlanningRouteOptimizationDto = {
  tripId: string;
  revision: string;
  generatedAt: string;
  strategy: PlanningOptimizationStrategyDto;
  travelMode: PlanningTravelModeDto;
  current: {
    itemIds: string[];
    distanceMeters: number;
    durationMinutes: number;
  };
  recommended: {
    itemIds: string[];
    distanceMeters: number;
    durationMinutes: number;
  };
  savings: {
    distanceMeters: number;
    durationMinutes: number;
    distancePercentage: number;
    durationPercentage: number;
  };
  confidence: {
    score: number;
    reasons: string[];
  };
  steps: PlanningOptimizationStepDto[];
  assumptions: string[];
};

export type PlanningScheduleSuggestionDto = {
  id: string;
  type:
    | 'ARRIVAL_TIME'
    | 'DURATION'
    | 'LUNCH_WINDOW'
    | 'REST_PERIOD'
    | 'HOTEL_CHECK_IN'
    | 'HOTEL_CHECK_OUT';
  itemId: string | null;
  recommendedStartsAt: string | null;
  recommendedDurationMinutes: number | null;
  reasonCode: string;
  confidence: number;
};

export type PlanningMapClusterDto = {
  id: string;
  centroid: { latitude: number; longitude: number };
  itemIds: string[];
  radiusMeters: number;
  density: number;
};

export type PlanningMapInsightDto = {
  clusters: PlanningMapClusterDto[];
  isolatedStops: Array<{
    itemId: string;
    nearestItemId: string | null;
    distanceMeters: number | null;
  }>;
  heatmap: Array<{
    latitude: number;
    longitude: number;
    intensity: number;
    itemCount: number;
  }>;
  groupingSuggestions: Array<{
    id: string;
    itemIds: string[];
    reasonCode: string;
  }>;
};

export type PlanningPlaceRecommendationDto = {
  id: string;
  source: 'INTERNAL' | 'GOOGLE' | 'MAPBOX' | 'OSM';
  name: string;
  categories: string[];
  latitude: number | null;
  longitude: number | null;
  relatedItemIds: string[];
  reasonCode: string;
  confidence: number;
};

export type PlanningBudgetInsightDto = {
  currency: string | null;
  spentAmount: number;
  budgetLimit: number | null;
  remainingAmount: number | null;
  usagePercentage: number | null;
  projectedTotal: number | null;
  projectedOverspendAmount: number | null;
  categoryBreakdown: Array<{
    categoryId: string | null;
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
  dailySpending: Array<{
    date: string;
    amount: number;
  }>;
  expensiveLocations: Array<{
    itemId: string;
    amount: number;
  }>;
  recommendations: Array<{
    code: string;
    severity: PlanningIssueSeverityDto;
    params: Record<string, string | number | boolean>;
  }>;
};

export type PlanningCollaborationInsightDto = {
  activeCollaboratorCount: number;
  pendingEditCount: number;
  recentActivityCount: number;
  activeCollaborators: Array<{
    userId: string;
    name: string;
    avatarUrl: string | null;
    activity: string;
    focusedEntityType: string | null;
    focusedEntityId: string | null;
    editingEntityType: string | null;
    editingEntityId: string | null;
  }>;
  contributorStats: Array<{
    userId: string | null;
    name: string;
    mutationCount: number;
    lastActivityAt: string | null;
  }>;
  editingHotspots: Array<{
    entityType: string;
    entityId: string | null;
    mutationCount: number;
  }>;
};

export type PlanningFilterFacetDto = {
  key: string;
  count: number;
  params: Record<string, string | number | boolean>;
};

export type PlanningFilterInsightsDto = {
  itemTypes: PlanningFilterFacetDto[];
  statuses: PlanningFilterFacetDto[];
  placeCategories: PlanningFilterFacetDto[];
  scheduleStates: PlanningFilterFacetDto[];
  budgetStates: PlanningFilterFacetDto[];
  collaborators: PlanningFilterFacetDto[];
  locationRadiusAnchors: Array<{
    itemId: string;
    radiusMeters: number;
    nearbyItemCount: number;
  }>;
};

export type PlanningRecommendationsDto = {
  optimization: PlanningRouteOptimizationDto;
  schedule: PlanningScheduleSuggestionDto[];
  places: PlanningPlaceRecommendationDto[];
  budget: PlanningBudgetInsightDto['recommendations'];
};

export type PlanningAnalysisDto = {
  tripId: string;
  revision: string;
  generatedAt: string;
  score: PlanningScoreDto;
  issues: PlanningIssueDto[];
  optimization: PlanningRouteOptimizationDto;
  scheduleSuggestions: PlanningScheduleSuggestionDto[];
  mapInsights: PlanningMapInsightDto;
  placeRecommendations: PlanningPlaceRecommendationDto[];
  budgetInsights: PlanningBudgetInsightDto;
  collaborationInsights: PlanningCollaborationInsightDto;
  filters: PlanningFilterInsightsDto;
};

export type PlanningInsightsDto = {
  tripId: string;
  revision: string;
  generatedAt: string;
  score: PlanningScoreDto;
  issues: PlanningIssueDto[];
  recommendations: PlanningRecommendationsDto;
  mapInsights: PlanningMapInsightDto;
  budgetInsights: PlanningBudgetInsightDto;
  collaborationInsights: PlanningCollaborationInsightDto;
  filters: PlanningFilterInsightsDto;
};

export type OptimizeTripRequestDto = {
  strategy?: PlanningOptimizationStrategyDto;
  travelMode?: PlanningTravelModeDto;
  fixedStartItemId?: string | null;
  fixedEndItemId?: string | null;
};

export type PlanningAnalysisResponseDto = {
  analysis: PlanningAnalysisDto;
};
export type PlanningRecommendationsResponseDto = {
  recommendations: PlanningRecommendationsDto;
};
export type PlanningOptimizationResponseDto = {
  optimization: PlanningRouteOptimizationDto;
};
export type PlanningInsightsResponseDto = {
  insights: PlanningInsightsDto;
};

export type PlanningEngineValidationKindDto =
  | 'TripValidation'
  | 'ScheduleValidation'
  | 'BudgetValidation'
  | 'RouteValidation'
  | 'TimelineValidation'
  | 'ConstraintValidation';

export type PlanningEngineIssueCategoryDto =
  | 'TRIP'
  | 'TIMELINE'
  | 'SCHEDULE'
  | 'ROUTE'
  | 'BUDGET'
  | 'CONSTRAINT';

export type PlanningEngineConstraintStatusDto = 'PASS' | 'WARN' | 'FAIL' | 'NOT_APPLICABLE';

export type PlanningEngineSuggestionTypeDto =
  | 'MOVE_EARLIER'
  | 'MOVE_LATER'
  | 'MERGE_NEARBY'
  | 'INSERT_BREAK'
  | 'INSERT_LUNCH'
  | 'INSERT_HOTEL'
  | 'REORDER_STOPS';

export type PlanningEngineHealthStatusDto = 'HEALTHY' | 'NEEDS_ATTENTION' | 'AT_RISK';

export type PlanningEngineIssueDto = {
  id: string;
  code: string;
  severity: PlanningIssueSeverityDto;
  category: PlanningEngineIssueCategoryDto;
  validation: PlanningEngineValidationKindDto;
  entityType: PlanningInsightEntityTypeDto | 'ROUTE_SEGMENT';
  entityId: string | null;
  affectedEntityIds: string[];
  messageKey: string;
  params: Record<string, string | number | boolean>;
  recommendedActionCode: string;
  confidence: number;
};

export type PlanningEngineTimelineSegmentDto = {
  itemId: string;
  placeId: string;
  sequence: number;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  durationMinutes: number;
  status: string;
  types: string[];
  scheduled: boolean;
  timezoneMismatch: boolean;
  lateNightArrival: boolean;
  duplicateVisit: boolean;
  idleGapBeforeMinutes: number | null;
  overlapPreviousMinutes: number | null;
};

export type PlanningEngineTravelSegmentDto = {
  id: string;
  fromItemId: string;
  toItemId: string;
  travelMode: PlanningTravelModeDto;
  distanceMeters: number | null;
  durationMinutes: number | null;
  walkingFeasible: boolean | null;
  longTransfer: boolean;
  unreachable: boolean;
  estimatedBy: 'HAVERSINE' | 'ROUTE_PROVIDER_READY';
  warnings: string[];
};

export type PlanningEngineMetricDto = {
  key:
    | 'tripDurationDays'
    | 'scheduledRatio'
    | 'unscheduledRatio'
    | 'travelRatio'
    | 'activityRatio'
    | 'walkingRatio'
    | 'budgetUsage'
    | 'placeDiversity'
    | 'categoryDiversity'
    | 'totalTravelDistance'
    | 'totalTravelDuration'
    | 'idleGapMinutes';
  value: number;
  unit: 'count' | 'ratio' | 'percent' | 'meters' | 'minutes' | 'days';
  explanationKey: string;
};

export type PlanningEngineConstraintResultDto = {
  id: string;
  code: string;
  status: PlanningEngineConstraintStatusDto;
  severity: PlanningIssueSeverityDto;
  affectedEntityIds: string[];
  messageKey: string;
  params: Record<string, string | number | boolean>;
};

export type PlanningEngineSuggestionDto = {
  id: string;
  type: PlanningEngineSuggestionTypeDto;
  reasonCode: string;
  confidence: number;
  affectedEntityIds: string[];
  blockingIssueIds: string[];
  estimatedImprovement: {
    distanceMeters?: number | undefined;
    durationMinutes?: number | undefined;
    scheduleMinutes?: number | undefined;
    scoreDelta?: number | undefined;
  };
  preview: {
    itemIds?: string[] | undefined;
    insertAfterItemId?: string | null | undefined;
    startsAt?: string | null | undefined;
    durationMinutes?: number | undefined;
  };
};

export type PlanningEngineTimelineDto = {
  segments: PlanningEngineTimelineSegmentDto[];
  scheduledItemCount: number;
  unscheduledItemCount: number;
  timezoneCount: number;
  duplicatePlaceCount: number;
};

export type PlanningEngineRouteDto = {
  travelMode: PlanningTravelModeDto;
  segments: PlanningEngineTravelSegmentDto[];
  totalDistanceMeters: number;
  totalDurationMinutes: number;
  longTransferCount: number;
  unreachableSegmentCount: number;
};

export type PlanningEngineBudgetDto = {
  currency: string | null;
  spentAmount: number;
  budgetLimit: number | null;
  remainingAmount: number | null;
  usagePercentage: number | null;
  dailySpend: Array<{
    date: string;
    amount: number;
  }>;
  expensiveDestinations: Array<{
    itemId: string;
    amount: number;
  }>;
};

export type PlanningEngineHealthDto = {
  status: PlanningEngineHealthStatusDto;
  score: number;
  maxScore: number;
  issueCounts: Record<PlanningIssueSeverityDto, number>;
};

export type PlanningEngineReadModelDto = {
  tripId: string;
  revision: string;
  generatedAt: string;
  health: PlanningEngineHealthDto;
  timeline: PlanningEngineTimelineDto;
  route: PlanningEngineRouteDto;
  budget: PlanningEngineBudgetDto;
  metrics: PlanningEngineMetricDto[];
  constraints: PlanningEngineConstraintResultDto[];
  issues: PlanningEngineIssueDto[];
  suggestions: PlanningEngineSuggestionDto[];
};

export type PlanningEngineResponseDto = {
  planning: PlanningEngineReadModelDto;
};

export type PlanningEngineIssuesResponseDto = {
  issues: PlanningEngineIssueDto[];
};

export type PlanningEngineMetricsResponseDto = {
  metrics: PlanningEngineMetricDto[];
};

export type PlanningEngineSuggestionsResponseDto = {
  suggestions: PlanningEngineSuggestionDto[];
};

export type PlanningEngineTimelineResponseDto = {
  timeline: PlanningEngineTimelineDto;
};

export type TripSummaryDto = {
  id: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  timezone: string;
  visibility: TripVisibilityDto;
  status: TripStatusDto;
  coverImageUrl: string | null;
  collaboratorCount: number;
  itineraryItemCount: number;
  noteCount: number;
  expenseCount: number;
  version: number;
  revision: string;
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

export type ReverseGeocodePlaceDto = {
  name: string | null;
  formattedAddress: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  timezone?: string | null;
  provider: ReverseGeocodeProviderDto;
  providerPlaceId?: string | null;
  providerPayload?: Record<string, unknown>;
};

export type ItineraryItemDto = {
  id: string;
  tripId: string;
  placeId: string;
  types: ItineraryItemTypeDto[];
  summary: string | null;
  sortOrder: number;
  startsAt: string | null;
  durationMinutes: number | null;
  status: ItineraryItemStatusDto;
  metadata: Record<string, unknown> | null;
  timezone: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TripRoutePreferenceDto = {
  id: string;
  tripId: string;
  fromItemId: string;
  toItemId: string;
  travelMode: RouteTravelModeDto;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type NoteDto = {
  id: string;
  tripId: string | null;
  authorId: string | null;
  parentNoteId: string | null;
  targetEntityType: NoteTargetEntityTypeDto;
  targetEntityId: string;
  body: string;
  mentions: Record<string, unknown>[] | null;
  attachments: Record<string, unknown>[] | null;
  metadata: Record<string, unknown> | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
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

export type BudgetSummaryDto = {
  budget: BudgetDto | null;
  currency: string;
  budgetLimit: number | null;
  spentAmount: number;
  remainingAmount: number | null;
  usagePercentage: number | null;
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
  categoryId: string | null;
  itineraryItemId: string | null;
  title: string;
  amount: number;
  currency: string;
  paidByUserId: string | null;
  spentAt: string | null;
  notes: string | null;
  attachments: Record<string, unknown>[] | null;
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
  summary: BudgetSummaryDto;
};

export type MutationEventDto = {
  id: string;
  tripId: string;
  actorId: string | null;
  deviceId: string | null;
  clientMutationId: string | null;
  entityType: string;
  entityId: string | null;
  operation: string;
  payload: Record<string, unknown> | null;
  revision: string;
  createdAt: string;
};

export type RevisionConflictDetailsDto = {
  currentRevision: string;
  latestTripRevision: string;
  entityVersion?: number;
  latestEntity?: Record<string, unknown> | null;
};

export type ListTripsQueryDto = {
  status?: TripStatusDto;
  page?: number;
  limit?: number;
};

export type CreateTripRequestDto = {
  title: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  visibility?: TripVisibilityDto;
  preferences?: Record<string, unknown>;
};

export type UpdateTripRequestDto = Partial<
  Omit<CreateTripRequestDto, 'startDate' | 'endDate' | 'preferences'> & {
    startDate: string | null;
    endDate: string | null;
    status: TripStatusDto;
    coverImageUrl: string | null;
    preferences: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    expectedRevision: string;
    clientMutationId: string;
    deviceId: string;
  }
>;

export type CreateItineraryItemRequestDto = {
  placeId: string;
  beforeItemId?: string | null;
  afterItemId?: string | null;
  types?: ItineraryItemTypeDto[];
  summary?: string | null;
  sortOrder?: number;
  startsAt?: string | null;
  durationMinutes?: number | null;
  status?: ItineraryItemStatusDto;
  metadata?: Record<string, unknown> | null;
  timezone?: string;
  expectedRevision?: string;
  clientMutationId?: string;
  deviceId?: string;
};

export type UpdateItineraryItemRequestDto = Partial<{
  placeId: string;
  types: ItineraryItemTypeDto[];
  summary: string | null;
  sortOrder: number;
  startsAt: string | null;
  durationMinutes: number | null;
  status: ItineraryItemStatusDto;
  metadata: Record<string, unknown> | null;
  timezone: string;
  expectedVersion: number;
  expectedRevision: string;
  clientMutationId: string;
  deviceId: string;
}>;

export type ReorderItineraryItemsRequestDto = {
  itemId: string;
  beforeItemId?: string | null;
  afterItemId?: string | null;
  expectedVersion?: number;
  expectedRevision?: string;
  clientMutationId?: string;
  deviceId?: string;
};

export type ReorderItineraryItemsResponseDto = {
  item: ItineraryItemDto;
  affectedItems?: ItineraryItemDto[];
  revision: string;
  clientMutationId?: string;
};

export type UpsertTripRoutePreferenceRequestDto = {
  travelMode: RouteTravelModeDto;
  expectedRevision?: string;
  clientMutationId?: string;
  deviceId?: string;
};

export type UpsertTripRoutePreferenceResponseDto = {
  routePreference: TripRoutePreferenceDto;
  revision: string;
  clientMutationId?: string;
};

export type DeleteItineraryItemQueryDto = {
  expectedRevision?: string;
  clientMutationId?: string;
  deviceId?: string;
};

export type CreateNoteRequestDto = {
  tripId?: string;
  targetEntityType: NoteTargetEntityTypeDto;
  targetEntityId: string;
  parentNoteId?: string;
  body: string;
  mentions?: Record<string, unknown>[] | null;
  attachments?: Record<string, unknown>[] | null;
  metadata?: Record<string, unknown> | null;
  expectedRevision?: string;
  clientMutationId?: string;
  deviceId?: string;
};

export type UpdateNoteRequestDto = Partial<{
  body: string;
  mentions: Record<string, unknown>[] | null;
  attachments: Record<string, unknown>[] | null;
  metadata: Record<string, unknown> | null;
  expectedVersion: number;
  expectedRevision: string;
  clientMutationId: string;
  deviceId: string;
}>;

export type DeleteNoteQueryDto = {
  expectedRevision?: string;
  clientMutationId?: string;
  deviceId?: string;
};

export type MutationResponseMetaDto = {
  revision: string;
  clientMutationId?: string;
};

export type ListMutationEventsQueryDto = {
  afterRevision?: string;
  sinceRevision?: string;
  cursor?: string;
  limit?: number;
};

export type ListMutationEventsResponseDto = {
  events: MutationEventDto[];
  latestRevision: string;
  hasMore: boolean;
  nextCursor: string | null;
};

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
  tripId?: string;
  targetEntityType?: NoteTargetEntityTypeDto;
  targetEntityId?: string;
  parentNoteId?: string;
};

export type SearchPlacesQueryDto = ListPlacesQueryDto & {
  lat?: number;
  lng?: number;
};

export type ReverseGeocodeQueryDto = {
  lat: number;
  lng: number;
};

export type ListExpensesQueryDto = CursorListQueryDto & {
  categoryId?: string;
  itineraryItemId?: string;
  paidByUserId?: string;
};

export type CreateExpenseRequestDto = {
  categoryId?: string | null;
  itineraryItemId?: string | null;
  title: string;
  amount: number;
  currency: string;
  paidByUserId?: string | null;
  spentAt?: string | null;
  notes?: string | null;
  attachments?: Record<string, unknown>[] | null;
  metadata?: Record<string, unknown> | null;
  expectedRevision?: string;
  clientMutationId?: string;
  deviceId?: string;
};

export type UpdateExpenseRequestDto = Partial<{
  categoryId: string | null;
  itineraryItemId: string | null;
  title: string;
  amount: number;
  currency: string;
  paidByUserId: string | null;
  spentAt: string | null;
  notes: string | null;
  attachments: Record<string, unknown>[] | null;
  metadata: Record<string, unknown> | null;
  expectedVersion: number;
  expectedRevision: string;
  clientMutationId: string;
  deviceId: string;
}>;

export type DeleteExpenseQueryDto = {
  expectedRevision?: string;
  clientMutationId?: string;
  deviceId?: string;
};

export type UpsertBudgetRequestDto = {
  currency?: string;
  totalLimit?: number | null;
  metadata?: Record<string, unknown> | null;
  expectedRevision?: string;
  clientMutationId?: string;
  deviceId?: string;
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

export type ResolvePlaceRequestDto = {
  provider: PlaceProviderDto;
  providerPlaceId?: string | null;
  source?: PlaceSourceDto;
  externalId?: string | null;
  name: string;
  address?: string | null;
  formattedAddress?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  websiteUrl?: string | null;
  phoneNumber?: string | null;
  timezone?: string | null;
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
      response: ApiSuccessResponse<{
        item: ItineraryItemDto;
        revision: string;
        clientMutationId?: string;
      }>;
    };
  };
  '/trips/{tripId}/itinerary/reorder': {
    patch: {
      request: ReorderItineraryItemsRequestDto;
      response: ApiSuccessResponse<ReorderItineraryItemsResponseDto>;
    };
  };
  '/trips/{tripId}/route-preferences': {
    get: {
      response: ApiSuccessResponse<{ routePreferences: TripRoutePreferenceDto[] }>;
    };
  };
  '/trips/{tripId}/route-preferences/{fromItemId}/{toItemId}': {
    put: {
      request: UpsertTripRoutePreferenceRequestDto;
      response: ApiSuccessResponse<UpsertTripRoutePreferenceResponseDto>;
    };
  };
  '/itinerary-items/{itemId}': {
    patch: {
      request: UpdateItineraryItemRequestDto;
      response: ApiSuccessResponse<{
        item: ItineraryItemDto;
        revision: string;
        clientMutationId?: string;
      }>;
    };
    delete: {
      query: DeleteItineraryItemQueryDto;
      response: void;
    };
  };
  '/trips/{tripId}/places': {
    get: {
      response: ApiSuccessResponse<{ places: PlaceDto[] }>;
    };
  };
  '/notes': {
    get: {
      query: ListNotesQueryDto;
      response: ApiSuccessResponse<{ notes: NoteDto[] }, { pagination: CursorPaginationMeta }>;
    };
    post: {
      request: CreateNoteRequestDto;
      response: ApiSuccessResponse<{ note: NoteDto; revision: string; clientMutationId?: string }>;
    };
  };
  '/notes/{noteId}': {
    patch: {
      request: UpdateNoteRequestDto;
      response: ApiSuccessResponse<{ note: NoteDto; revision: string; clientMutationId?: string }>;
    };
    delete: {
      query: DeleteNoteQueryDto;
      response: ApiSuccessResponse<{ note: NoteDto; revision: string; clientMutationId?: string }>;
    };
  };
  '/trips/{tripId}/collaborators': {
    get: {
      response: ApiSuccessResponse<{ collaborators: TripCollaboratorDto[] }>;
    };
  };
  '/trips/{tripId}/expenses': {
    get: {
      query: ListExpensesQueryDto;
      response: ApiSuccessResponse<TripExpensesDto, { pagination: CursorPaginationMeta }>;
    };
    post: {
      request: CreateExpenseRequestDto;
      response: ApiSuccessResponse<{
        expense: ExpenseDto;
        revision: string;
        clientMutationId?: string;
      }>;
    };
  };
  '/expenses/{expenseId}': {
    patch: {
      request: UpdateExpenseRequestDto;
      response: ApiSuccessResponse<{
        expense: ExpenseDto;
        revision: string;
        clientMutationId?: string;
      }>;
    };
    delete: {
      query: DeleteExpenseQueryDto;
      response: void;
    };
  };
  '/trips/{tripId}/budget': {
    get: {
      response: ApiSuccessResponse<BudgetSummaryDto>;
    };
    put: {
      request: UpsertBudgetRequestDto;
      response: ApiSuccessResponse<BudgetSummaryDto & MutationResponseMetaDto>;
    };
  };
  '/trips/{tripId}/mutation-events': {
    get: {
      query: ListMutationEventsQueryDto;
      response: ApiSuccessResponse<ListMutationEventsResponseDto>;
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
  '/places/resolve': {
    post: {
      request: ResolvePlaceRequestDto;
      response: ApiSuccessResponse<{ place: PlaceDto; created: boolean }>;
    };
  };
  '/places/search': {
    get: {
      query: SearchPlacesQueryDto;
      response: ApiSuccessResponse<{ places: PlaceDto[] }>;
    };
  };
  '/places/reverse-geocode': {
    get: {
      query: ReverseGeocodeQueryDto;
      response: ApiSuccessResponse<{ place: ReverseGeocodePlaceDto }>;
    };
  };
  '/places/{placeId}': {
    get: {
      response: ApiSuccessResponse<{ place: PlaceDto }>;
    };
  };
};
