import type {
  PlanningAnalysisDto,
  PlanningBudgetInsightDto,
  PlanningCollaborationInsightDto,
  PlanningFilterFacetDto,
  PlanningFilterInsightsDto,
  PlanningInsightsDto,
  PlanningIssueDto,
  PlanningMapInsightDto,
  PlanningOptimizationStrategyDto,
  PlanningPlaceRecommendationDto,
  PlanningRecommendationsDto,
  PlanningRouteOptimizationDto,
  PlanningScheduleSuggestionDto,
  PlanningScoreDimensionDto,
  PlanningTravelModeDto
} from '@/api/contracts/index.js';
import type {
  DecimalLike,
  PlanningTripSnapshot
} from '@/modules/planning-intelligence/planning-intelligence.repository.js';
import type { PresenceProjection } from '@/modules/collaboration/types/collaboration.types.js';

type TripSnapshot = PlanningTripSnapshot;
type SnapshotItem = TripSnapshot['itineraryItems'][number];
type SnapshotExpense = TripSnapshot['expenses'][number];
type Coordinate = { latitude: number; longitude: number };
type RouteLegEstimate = {
  fromItemId: string;
  toItemId: string;
  distanceMeters: number;
  durationMinutes: number;
};

const issueMessagePrefix = 'trip.editor.insights.issues.codes';
const metersPerKilometer = 1000;
const defaultDurationByType: Record<string, number> = {
  ACTIVITY: 90,
  LODGING: 45,
  FOOD: 75,
  SHOPPING: 90,
  TRANSPORTATION: 45,
  OTHER: 60
};
const travelSpeedKmhByMode: Record<PlanningTravelModeDto, number> = {
  walking: 4.5,
  bicycling: 14,
  driving: 38,
  transit: 24,
  mixed: 24
};

export function buildPlanningAnalysis(
  trip: TripSnapshot,
  presence: PresenceProjection[] = [],
  input: {
    strategy?: PlanningOptimizationStrategyDto | undefined;
    travelMode?: PlanningTravelModeDto | undefined;
    fixedStartItemId?: string | null | undefined;
    fixedEndItemId?: string | null | undefined;
  } = {}
): PlanningAnalysisDto {
  const generatedAt = new Date().toISOString();
  const strategy = input.strategy ?? 'SHORTEST_TIME';
  const travelMode = input.travelMode ?? strategyToTravelMode(strategy);
  const optimization = buildRouteOptimization(trip, {
    strategy,
    travelMode,
    fixedStartItemId: input.fixedStartItemId,
    fixedEndItemId: input.fixedEndItemId
  });
  const mapInsights = buildMapInsights(trip);
  const budgetInsights = buildBudgetInsights(trip);
  const scheduleSuggestions = buildScheduleSuggestions(trip);
  const placeRecommendations = buildPlaceRecommendations(trip, mapInsights);
  const collaborationInsights = buildCollaborationInsights(trip, presence);
  const issues = buildIssues(trip, optimization, mapInsights, budgetInsights);
  const score = buildScore(trip, issues, optimization, budgetInsights, collaborationInsights);

  return {
    tripId: trip.id,
    revision: trip.revision.toString(),
    generatedAt,
    score,
    issues,
    optimization,
    scheduleSuggestions,
    mapInsights,
    placeRecommendations,
    budgetInsights,
    collaborationInsights,
    filters: buildFilterInsights(trip, issues)
  };
}

export function toPlanningInsights(analysis: PlanningAnalysisDto): PlanningInsightsDto {
  return {
    tripId: analysis.tripId,
    revision: analysis.revision,
    generatedAt: analysis.generatedAt,
    score: analysis.score,
    issues: analysis.issues,
    recommendations: toPlanningRecommendations(analysis),
    mapInsights: analysis.mapInsights,
    budgetInsights: analysis.budgetInsights,
    collaborationInsights: analysis.collaborationInsights,
    filters: analysis.filters
  };
}

export function toPlanningRecommendations(
  analysis: PlanningAnalysisDto
): PlanningRecommendationsDto {
  return {
    optimization: analysis.optimization,
    schedule: analysis.scheduleSuggestions,
    places: analysis.placeRecommendations,
    budget: analysis.budgetInsights.recommendations
  };
}

function buildRouteOptimization(
  trip: TripSnapshot,
  input: {
    strategy: PlanningOptimizationStrategyDto;
    travelMode: PlanningTravelModeDto;
    fixedStartItemId?: string | null | undefined;
    fixedEndItemId?: string | null | undefined;
  }
): PlanningRouteOptimizationDto {
  const itemsWithCoordinates = trip.itineraryItems.filter((item) => getItemCoordinate(item));
  const currentItemIds = trip.itineraryItems.map((item) => item.id);
  const recommendedItemIds = optimizeItemOrder(itemsWithCoordinates, input);
  const currentLegs = estimateRouteLegs(trip.itineraryItems, input.travelMode, trip);
  const recommendedItems = recommendedItemIds
    .map((itemId) => trip.itineraryItems.find((item) => item.id === itemId))
    .filter((item): item is SnapshotItem => item !== undefined);
  const recommendedLegs = estimateRouteLegs(recommendedItems, input.travelMode, trip);
  const currentDistanceMeters = sumLegDistance(currentLegs);
  const recommendedDistanceMeters = sumLegDistance(recommendedLegs);
  const currentDurationMinutes = sumLegDuration(currentLegs);
  const recommendedDurationMinutes = sumLegDuration(recommendedLegs);
  const distanceSavings = Math.max(0, currentDistanceMeters - recommendedDistanceMeters);
  const durationSavings = Math.max(0, currentDurationMinutes - recommendedDurationMinutes);
  const coordinateCoverage =
    trip.itineraryItems.length === 0 ? 0 : itemsWithCoordinates.length / trip.itineraryItems.length;
  const savingsRatio =
    currentDistanceMeters > 0 ? Math.min(1, distanceSavings / currentDistanceMeters) : 0;

  return {
    tripId: trip.id,
    revision: trip.revision.toString(),
    generatedAt: new Date().toISOString(),
    strategy: input.strategy,
    travelMode: input.travelMode,
    current: {
      itemIds: currentItemIds,
      distanceMeters: Math.round(currentDistanceMeters),
      durationMinutes: Math.round(currentDurationMinutes)
    },
    recommended: {
      itemIds: recommendedItemIds,
      distanceMeters: Math.round(recommendedDistanceMeters),
      durationMinutes: Math.round(recommendedDurationMinutes)
    },
    savings: {
      distanceMeters: Math.round(distanceSavings),
      durationMinutes: Math.round(durationSavings),
      distancePercentage: toPercentage(distanceSavings, currentDistanceMeters),
      durationPercentage: toPercentage(durationSavings, currentDurationMinutes)
    },
    confidence: {
      score: roundScore(Math.min(0.92, 0.25 + coordinateCoverage * 0.45 + savingsRatio * 0.3)),
      reasons: [
        coordinateCoverage >= 0.8 ? 'coordinateCoverageHigh' : 'coordinateCoveragePartial',
        savingsRatio >= 0.15 ? 'meaningfulSavings' : 'limitedSavings',
        input.travelMode === 'mixed' ? 'mixedModeUsesRoutePreferences' : 'modeSpeedEstimate'
      ]
    },
    steps: recommendedItems.map((item, index) => {
      const previousItem = recommendedItems[index - 1];
      const leg = previousItem ? estimateLeg(previousItem, item, input.travelMode, trip) : null;

      return {
        itemId: item.id,
        placeId: item.placeId,
        sequence: currentItemIds.indexOf(item.id) + 1,
        recommendedSequence: index + 1,
        distanceFromPreviousMeters: leg ? Math.round(leg.distanceMeters) : null,
        durationFromPreviousMinutes: leg ? Math.round(leg.durationMinutes) : null
      };
    }),
    assumptions: [
      'haversineDistance',
      'modeSpeedEstimate',
      'openingHoursNotApplied',
      'itineraryNotModified'
    ]
  };
}

function optimizeItemOrder(
  items: SnapshotItem[],
  input: {
    fixedStartItemId?: string | null | undefined;
    fixedEndItemId?: string | null | undefined;
  }
) {
  if (items.length <= 2) {
    return items.map((item) => item.id);
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const start = (input.fixedStartItemId ? byId.get(input.fixedStartItemId) : undefined) ?? items[0];
  const fixedEnd = input.fixedEndItemId ? byId.get(input.fixedEndItemId) : undefined;
  const remaining = new Map(items.map((item) => [item.id, item]));
  const order: SnapshotItem[] = [];

  if (start) {
    order.push(start);
    remaining.delete(start.id);
  }
  if (fixedEnd) {
    remaining.delete(fixedEnd.id);
  }

  while (remaining.size > 0) {
    const current = order[order.length - 1];
    if (!current) break;

    let nearest: SnapshotItem | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of remaining.values()) {
      const distance = distanceBetweenItems(current, candidate);
      if (distance !== null && distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }

    if (!nearest) {
      break;
    }

    order.push(nearest);
    remaining.delete(nearest.id);
  }

  if (fixedEnd) {
    order.push(fixedEnd);
  }

  return order.map((item) => item.id);
}

function buildIssues(
  trip: TripSnapshot,
  optimization: PlanningRouteOptimizationDto,
  mapInsights: PlanningMapInsightDto,
  budgetInsights: PlanningBudgetInsightDto
): PlanningIssueDto[] {
  const issues: PlanningIssueDto[] = [];

  if (trip.itineraryItems.length === 0) {
    issues.push(createIssue('EMPTY_TRIP', 'ITINERARY', 'CRITICAL', 'TRIP', trip.id, {}, 0.98));
  }

  const byPlace = groupBy(trip.itineraryItems, (item) => item.placeId);
  for (const [placeId, items] of byPlace) {
    if (items.length > 1) {
      issues.push(
        createIssue(
          'DUPLICATED_PLACE',
          'ITINERARY',
          'WARNING',
          'PLACE',
          placeId,
          { count: items.length },
          0.92,
          items.map((item) => item.id)
        )
      );
    }
  }

  const missingSchedule = trip.itineraryItems.filter((item) => !item.startsAt);
  if (missingSchedule.length > 0) {
    issues.push(
      createIssue(
        'MISSING_SCHEDULE',
        'SCHEDULE',
        trip.itineraryItems.length === missingSchedule.length ? 'WARNING' : 'INFO',
        'TRIP',
        trip.id,
        { count: missingSchedule.length },
        0.9,
        missingSchedule.map((item) => item.id)
      )
    );
  }

  for (let index = 0; index < trip.itineraryItems.length - 1; index += 1) {
    const first = trip.itineraryItems[index];
    const second = trip.itineraryItems[index + 1];
    if (!first || !second) continue;

    const leg = estimateLeg(first, second, 'mixed', trip);
    if (leg && leg.distanceMeters >= 25_000) {
      issues.push(
        createIssue(
          leg.distanceMeters >= 70_000 ? 'EXCESSIVE_TRAVEL_DISTANCE' : 'LARGE_TRAVEL_GAP',
          'ROUTE',
          leg.distanceMeters >= 70_000 ? 'CRITICAL' : 'WARNING',
          'ROUTE',
          `${first.id}:${second.id}`,
          { distanceKm: Math.round(leg.distanceMeters / metersPerKilometer) },
          0.86,
          [first.id, second.id]
        )
      );
    }

    const overlapMinutes = getOverlapMinutes(first, second);
    if (overlapMinutes > 0) {
      issues.push(
        createIssue(
          'OVERLAPPING_ACTIVITIES',
          'SCHEDULE',
          'CRITICAL',
          'ITINERARY_ITEM',
          second.id,
          { minutes: overlapMinutes },
          0.94,
          [first.id, second.id]
        )
      );
    }

    const impossibleGap = getImpossibleGapMinutes(first, second, leg?.durationMinutes ?? 0);
    if (impossibleGap > 0) {
      issues.push(
        createIssue(
          'IMPOSSIBLE_SCHEDULE',
          'SCHEDULE',
          'CRITICAL',
          'ITINERARY_ITEM',
          second.id,
          { minutes: impossibleGap },
          0.82,
          [first.id, second.id]
        )
      );
    }
  }

  if (
    optimization.savings.distancePercentage >= 15 &&
    optimization.savings.distanceMeters > 2_000
  ) {
    issues.push(
      createIssue(
        'INEFFICIENT_TRAVEL',
        'ROUTE',
        'WARNING',
        'TRIP',
        trip.id,
        {
          distancePercentage: optimization.savings.distancePercentage,
          distanceKm: Math.round(optimization.savings.distanceMeters / metersPerKilometer)
        },
        optimization.confidence.score
      )
    );
  }

  for (const isolated of mapInsights.isolatedStops) {
    issues.push(
      createIssue(
        'ISOLATED_STOP',
        'MAP',
        'INFO',
        'ITINERARY_ITEM',
        isolated.itemId,
        { distanceKm: Math.round((isolated.distanceMeters ?? 0) / metersPerKilometer) },
        0.72,
        isolated.nearestItemId ? [isolated.nearestItemId] : []
      )
    );
  }

  if (budgetInsights.usagePercentage !== null && budgetInsights.usagePercentage > 100) {
    issues.push(
      createIssue(
        'BUDGET_OVERSPEND',
        'BUDGET',
        'WARNING',
        'BUDGET',
        trip.budget?.id ?? trip.id,
        { percentage: Math.round(budgetInsights.usagePercentage) },
        0.95
      )
    );
  }

  const missingCoordinates = trip.itineraryItems.filter((item) => !getItemCoordinate(item));
  if (missingCoordinates.length > 0) {
    issues.push(
      createIssue(
        'MISSING_COORDINATES',
        'MAP',
        'WARNING',
        'TRIP',
        trip.id,
        { count: missingCoordinates.length },
        0.96,
        missingCoordinates.map((item) => item.id)
      )
    );
  }

  return issues.sort((left, right) => severityRank(right.severity) - severityRank(left.severity));
}

function buildScheduleSuggestions(trip: TripSnapshot): PlanningScheduleSuggestionDto[] {
  const suggestions: PlanningScheduleSuggestionDto[] = [];
  let cursor = getTripStartCursor(trip);

  for (const [index, item] of trip.itineraryItems.entries()) {
    const duration = item.durationMinutes ?? defaultDurationForItem(item);

    if (!item.startsAt) {
      suggestions.push({
        id: `arrival:${item.id}`,
        type: 'ARRIVAL_TIME',
        itemId: item.id,
        recommendedStartsAt: cursor.toISOString(),
        recommendedDurationMinutes: duration,
        reasonCode: index === 0 ? 'startAtMorning' : 'sequenceAfterPreviousStop',
        confidence: 0.7
      });
    }

    if (item.durationMinutes === null) {
      suggestions.push({
        id: `duration:${item.id}`,
        type: 'DURATION',
        itemId: item.id,
        recommendedStartsAt: null,
        recommendedDurationMinutes: duration,
        reasonCode: 'defaultDurationByStopType',
        confidence: 0.62
      });
    }

    if (item.types.includes('LODGING')) {
      suggestions.push({
        id: `hotel-check:${item.id}`,
        type: 'HOTEL_CHECK_IN',
        itemId: item.id,
        recommendedStartsAt: null,
        recommendedDurationMinutes: 30,
        reasonCode: 'lodgingCheckInBuffer',
        confidence: 0.58
      });
    }

    cursor = new Date(cursor.getTime() + (duration + 30) * 60_000);
  }

  const hasLunchStop = trip.itineraryItems.some((item) => item.types.includes('FOOD'));
  if (trip.itineraryItems.length >= 3 && !hasLunchStop) {
    suggestions.push({
      id: 'lunch-window',
      type: 'LUNCH_WINDOW',
      itemId: null,
      recommendedStartsAt: getLunchWindow(trip).toISOString(),
      recommendedDurationMinutes: 75,
      reasonCode: 'noFoodStopNearLunch',
      confidence: 0.66
    });
  }

  if (trip.itineraryItems.length >= 6) {
    suggestions.push({
      id: 'rest-period',
      type: 'REST_PERIOD',
      itemId: null,
      recommendedStartsAt: null,
      recommendedDurationMinutes: 30,
      reasonCode: 'denseDayNeedsRest',
      confidence: 0.6
    });
  }

  return suggestions.slice(0, 12);
}

function buildMapInsights(trip: TripSnapshot): PlanningMapInsightDto {
  const coordinateItems = trip.itineraryItems
    .map((item) => ({ item, coordinate: getItemCoordinate(item) }))
    .filter((entry): entry is { item: SnapshotItem; coordinate: Coordinate } =>
      Boolean(entry.coordinate)
    );
  const cells = new Map<string, { items: SnapshotItem[]; latTotal: number; lngTotal: number }>();

  for (const entry of coordinateItems) {
    const key = `${Math.round(entry.coordinate.latitude / 0.025)}:${Math.round(
      entry.coordinate.longitude / 0.025
    )}`;
    const cell = cells.get(key) ?? { items: [], latTotal: 0, lngTotal: 0 };
    cell.items.push(entry.item);
    cell.latTotal += entry.coordinate.latitude;
    cell.lngTotal += entry.coordinate.longitude;
    cells.set(key, cell);
  }

  const clusters = Array.from(cells.entries())
    .filter(([, cell]) => cell.items.length >= 2)
    .map(([key, cell]) => {
      const centroid = {
        latitude: roundCoordinate(cell.latTotal / cell.items.length),
        longitude: roundCoordinate(cell.lngTotal / cell.items.length)
      };

      return {
        id: `cluster:${key}`,
        centroid,
        itemIds: cell.items.map((item) => item.id),
        radiusMeters: Math.round(
          Math.max(
            ...cell.items.map((item) => {
              const coordinate = getItemCoordinate(item);
              return coordinate ? haversineDistanceMeters(centroid, coordinate) : 0;
            })
          )
        ),
        density: cell.items.length
      };
    });
  const isolatedStops = coordinateItems
    .map(({ item }) => {
      let nearestItemId: string | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const candidate of coordinateItems) {
        if (candidate.item.id === item.id) continue;

        const distance = distanceBetweenItems(item, candidate.item);
        if (distance !== null && distance < nearestDistance) {
          nearestDistance = distance;
          nearestItemId = candidate.item.id;
        }
      }

      return {
        itemId: item.id,
        nearestItemId,
        distanceMeters: Number.isFinite(nearestDistance) ? Math.round(nearestDistance) : null
      };
    })
    .filter((entry) => (entry.distanceMeters ?? 0) >= 12_000)
    .slice(0, 8);

  return {
    clusters,
    isolatedStops,
    heatmap: clusters.map((cluster) => ({
      latitude: cluster.centroid.latitude,
      longitude: cluster.centroid.longitude,
      intensity: cluster.density,
      itemCount: cluster.itemIds.length
    })),
    groupingSuggestions: clusters.slice(0, 5).map((cluster) => ({
      id: `group:${cluster.id}`,
      itemIds: cluster.itemIds,
      reasonCode: 'nearbyStops'
    }))
  };
}

function buildPlaceRecommendations(
  trip: TripSnapshot,
  mapInsights: PlanningMapInsightDto
): PlanningPlaceRecommendationDto[] {
  const recommendations: PlanningPlaceRecommendationDto[] = [];
  const itemTypes = new Set(trip.itineraryItems.flatMap((item) => item.types));
  const anchor = mapInsights.clusters[0]?.centroid ?? getItemCoordinate(trip.itineraryItems[0]);
  const anchorItemIds =
    mapInsights.clusters[0]?.itemIds ?? trip.itineraryItems.slice(0, 1).map((item) => item.id);

  if (!anchor) {
    return recommendations;
  }

  if (!itemTypes.has('FOOD')) {
    recommendations.push({
      id: 'internal:food-near-cluster',
      source: 'INTERNAL',
      name: 'Food stop near planned cluster',
      categories: ['food'],
      latitude: anchor.latitude,
      longitude: anchor.longitude,
      relatedItemIds: anchorItemIds,
      reasonCode: 'missingFoodStop',
      confidence: 0.58
    });
  }

  if (!itemTypes.has('LODGING') && trip.itineraryItems.length >= 2) {
    recommendations.push({
      id: 'internal:lodging-near-cluster',
      source: 'INTERNAL',
      name: 'Lodging near main activity area',
      categories: ['lodging'],
      latitude: anchor.latitude,
      longitude: anchor.longitude,
      relatedItemIds: anchorItemIds,
      reasonCode: 'missingLodgingStop',
      confidence: 0.5
    });
  }

  if (trip.itineraryItems.length > 0) {
    recommendations.push({
      id: 'internal:nearby-attraction',
      source: 'INTERNAL',
      name: 'Nearby attraction',
      categories: ['activity'],
      latitude: anchor.latitude,
      longitude: anchor.longitude,
      relatedItemIds: anchorItemIds,
      reasonCode: 'extendDenseCluster',
      confidence: 0.46
    });
  }

  return recommendations;
}

function buildBudgetInsights(trip: TripSnapshot): PlanningBudgetInsightDto {
  const spentAmount = trip.expenses.reduce((total, expense) => total + toNumber(expense.amount), 0);
  const budgetLimit = toNullableNumber(trip.budget?.totalLimit);
  const currency = trip.budget?.currency ?? trip.expenses[0]?.currency ?? null;
  const remainingAmount = budgetLimit === null ? null : budgetLimit - spentAmount;
  const usagePercentage = budgetLimit && budgetLimit > 0 ? (spentAmount / budgetLimit) * 100 : null;
  const categoryBreakdown = buildCategoryBreakdown(trip.expenses, spentAmount);
  const dailySpending = buildDailySpending(trip.expenses);
  const projectedTotal = projectTripSpend(trip, dailySpending);
  const projectedOverspendAmount =
    budgetLimit !== null && projectedTotal !== null
      ? Math.max(0, projectedTotal - budgetLimit)
      : null;
  const expensiveLocations = Array.from(
    groupBy(
      trip.expenses.filter((expense) => expense.itineraryItemId),
      (expense) => expense.itineraryItemId ?? ''
    )
  )
    .map(([itemId, expenses]) => ({
      itemId,
      amount: roundMoney(expenses.reduce((total, expense) => total + toNumber(expense.amount), 0))
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 5);

  return {
    currency,
    spentAmount: roundMoney(spentAmount),
    budgetLimit,
    remainingAmount: remainingAmount === null ? null : roundMoney(remainingAmount),
    usagePercentage: usagePercentage === null ? null : Math.round(usagePercentage),
    projectedTotal,
    projectedOverspendAmount,
    categoryBreakdown,
    dailySpending,
    expensiveLocations,
    recommendations: buildBudgetRecommendations({
      budgetLimit,
      spentAmount,
      usagePercentage,
      projectedOverspendAmount,
      uncategorizedCount: trip.expenses.filter((expense) => !expense.categoryId).length
    })
  };
}

function buildCollaborationInsights(
  trip: TripSnapshot,
  presence: PresenceProjection[]
): PlanningCollaborationInsightDto {
  const mutationEvents = trip.mutationEvents;
  const contributorMap = new Map<
    string,
    { userId: string | null; name: string; mutationCount: number; lastActivityAt: string | null }
  >();

  for (const event of mutationEvents) {
    const userKey = event.actorId ?? 'system';
    const current = contributorMap.get(userKey) ?? {
      userId: event.actorId,
      name: event.actor?.name ?? 'System',
      mutationCount: 0,
      lastActivityAt: null
    };
    current.mutationCount += 1;
    current.lastActivityAt ??= event.createdAt.toISOString();
    contributorMap.set(userKey, current);
  }

  const hotspotMap = new Map<
    string,
    { entityType: string; entityId: string | null; mutationCount: number }
  >();
  for (const event of mutationEvents) {
    const key = `${event.entityType}:${event.entityId ?? 'trip'}`;
    const current = hotspotMap.get(key) ?? {
      entityType: event.entityType,
      entityId: event.entityId,
      mutationCount: 0
    };
    current.mutationCount += 1;
    hotspotMap.set(key, current);
  }

  return {
    activeCollaboratorCount: new Set(presence.map((entry) => entry.userId)).size,
    pendingEditCount: presence.filter((entry) => entry.editing).length,
    recentActivityCount: mutationEvents.length,
    activeCollaborators: presence.slice(0, 20).map((entry) => ({
      userId: entry.userId,
      name: entry.displayName,
      avatarUrl: entry.avatarUrl,
      activity: entry.activity,
      focusedEntityType: entry.focus?.entityType ?? null,
      focusedEntityId: entry.focus?.entityId ?? null,
      editingEntityType: entry.editing?.entityType ?? null,
      editingEntityId: entry.editing?.entityId ?? null
    })),
    contributorStats: Array.from(contributorMap.values()).sort(
      (left, right) => right.mutationCount - left.mutationCount
    ),
    editingHotspots: Array.from(hotspotMap.values())
      .sort((left, right) => right.mutationCount - left.mutationCount)
      .slice(0, 8)
  };
}

function buildScore(
  trip: TripSnapshot,
  issues: PlanningIssueDto[],
  optimization: PlanningRouteOptimizationDto,
  budget: PlanningBudgetInsightDto,
  collaboration: PlanningCollaborationInsightDto
) {
  const itemCount = trip.itineraryItems.length;
  const scheduledCount = trip.itineraryItems.filter((item) => item.startsAt).length;
  const scheduleCompleteness = itemCount === 0 ? 0 : (scheduledCount / itemCount) * 100;
  const routePenalty = Math.min(55, optimization.savings.distancePercentage * 1.5);
  const travelEfficiency = Math.max(0, 100 - routePenalty);
  const budgetHealth =
    budget.budgetLimit === null
      ? 55
      : budget.usagePercentage === null
        ? 70
        : Math.max(0, Math.min(100, 120 - budget.usagePercentage));
  const collaborationCompleteness =
    trip.collaborators.length === 0
      ? 60
      : Math.min(100, 50 + collaboration.contributorStats.length * 15);
  const criticalIssues = issues.filter((issue) => issue.severity === 'CRITICAL').length;
  const warningIssues = issues.filter((issue) => issue.severity === 'WARNING').length;
  const itineraryConsistency = Math.max(0, 100 - criticalIssues * 22 - warningIssues * 8);
  const dimensions: PlanningScoreDimensionDto[] = [
    buildScoreDimension('scheduleCompleteness', scheduleCompleteness, [
      scheduledCount === itemCount ? 'allStopsScheduled' : 'someStopsUnscheduled'
    ]),
    buildScoreDimension('travelEfficiency', travelEfficiency, optimization.confidence.reasons),
    buildScoreDimension('budgetHealth', budgetHealth, [
      budget.budgetLimit === null ? 'budgetMissing' : 'budgetConfigured'
    ]),
    buildScoreDimension('collaborationCompleteness', collaborationCompleteness, [
      collaboration.contributorStats.length > 1 ? 'multipleContributors' : 'singleContributor'
    ]),
    buildScoreDimension('itineraryConsistency', itineraryConsistency, [
      criticalIssues > 0 ? 'criticalIssuesPresent' : 'noCriticalIssues'
    ])
  ];
  const overall = Math.round(
    dimensions.reduce((total, dimension) => total + dimension.score, 0) / dimensions.length
  );

  return {
    overall,
    maxScore: 100,
    dimensions,
    explanationKey: 'trip.editor.insights.score.overall'
  };
}

function buildFilterInsights(
  trip: TripSnapshot,
  issues: PlanningIssueDto[]
): PlanningFilterInsightsDto {
  const unscheduledIds = new Set(
    trip.itineraryItems.filter((item) => !item.startsAt).map((item) => item.id)
  );
  const issueIds = new Set(issues.flatMap((issue) => issue.relatedEntityIds));
  const placeCategoryCounts = new Map<string, number>();

  for (const item of trip.itineraryItems) {
    for (const category of item.place.categories) {
      placeCategoryCounts.set(category, (placeCategoryCounts.get(category) ?? 0) + 1);
    }
  }

  return {
    itemTypes: facetsFromCounts(countValues(trip.itineraryItems.flatMap((item) => item.types))),
    statuses: facetsFromCounts(countValues(trip.itineraryItems.map((item) => item.status))),
    placeCategories: facetsFromCounts(placeCategoryCounts),
    scheduleStates: [
      facet('UNSCHEDULED', unscheduledIds.size),
      facet('HAS_WARNINGS', issueIds.size)
    ].filter((entry) => entry.count > 0),
    budgetStates: [
      facet('HAS_EXPENSES', trip.expenses.length),
      facet('UNCATEGORIZED', trip.expenses.filter((expense) => !expense.categoryId).length),
      facet('LINKED_TO_STOPS', trip.expenses.filter((expense) => expense.itineraryItemId).length)
    ].filter((entry) => entry.count > 0),
    collaborators: facetsFromCounts(
      countValues(trip.mutationEvents.map((event) => event.actorId ?? 'system'))
    ),
    locationRadiusAnchors: trip.itineraryItems
      .map((item) => ({
        itemId: item.id,
        radiusMeters: 2_000,
        nearbyItemCount: trip.itineraryItems.filter((candidate) => {
          if (candidate.id === item.id) return false;
          const distance = distanceBetweenItems(item, candidate);
          return distance !== null && distance <= 2_000;
        }).length
      }))
      .filter((entry) => entry.nearbyItemCount > 0)
      .slice(0, 10)
  };
}

function estimateRouteLegs(
  items: SnapshotItem[],
  travelMode: PlanningTravelModeDto,
  trip: TripSnapshot
): RouteLegEstimate[] {
  const legs: RouteLegEstimate[] = [];

  for (let index = 0; index < items.length - 1; index += 1) {
    const from = items[index];
    const to = items[index + 1];
    if (!from || !to) continue;

    const leg = estimateLeg(from, to, travelMode, trip);
    if (leg) {
      legs.push(leg);
    }
  }

  return legs;
}

function estimateLeg(
  from: SnapshotItem,
  to: SnapshotItem,
  travelMode: PlanningTravelModeDto,
  trip: TripSnapshot
): RouteLegEstimate | null {
  const distanceMeters = distanceBetweenItems(from, to);
  if (distanceMeters === null) {
    return null;
  }

  const effectiveMode =
    travelMode === 'mixed' ? getStoredTravelMode(from.id, to.id, trip) : travelMode;
  const speedKmh = travelSpeedKmhByMode[effectiveMode] ?? travelSpeedKmhByMode.driving;
  const durationMinutes = (distanceMeters / metersPerKilometer / speedKmh) * 60;

  return {
    fromItemId: from.id,
    toItemId: to.id,
    distanceMeters,
    durationMinutes
  };
}

function getStoredTravelMode(
  fromItemId: string,
  toItemId: string,
  trip: TripSnapshot
): PlanningTravelModeDto {
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

function strategyToTravelMode(strategy: PlanningOptimizationStrategyDto): PlanningTravelModeDto {
  if (strategy === 'WALKING') return 'walking';
  if (strategy === 'DRIVING') return 'driving';
  if (strategy === 'PUBLIC_TRANSPORT') return 'transit';
  if (strategy === 'MIXED') return 'mixed';
  return 'mixed';
}

function distanceBetweenItems(first: SnapshotItem, second: SnapshotItem) {
  const firstCoordinate = getItemCoordinate(first);
  const secondCoordinate = getItemCoordinate(second);

  if (!firstCoordinate || !secondCoordinate) {
    return null;
  }

  return haversineDistanceMeters(firstCoordinate, secondCoordinate);
}

function getItemCoordinate(item: SnapshotItem | undefined): Coordinate | null {
  const latitude = toNullableNumber(item?.place.latitude);
  const longitude = toNullableNumber(item?.place.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

function haversineDistanceMeters(first: Coordinate, second: Coordinate) {
  const earthRadiusMeters = 6_371_000;
  const lat1 = toRadians(first.latitude);
  const lat2 = toRadians(second.latitude);
  const deltaLat = toRadians(second.latitude - first.latitude);
  const deltaLng = toRadians(second.longitude - first.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function createIssue(
  code: string,
  category: PlanningIssueDto['category'],
  severity: PlanningIssueDto['severity'],
  entityType: PlanningIssueDto['entityType'],
  entityId: string | null,
  params: Record<string, string | number | boolean>,
  confidence: number,
  relatedEntityIds: string[] = []
): PlanningIssueDto {
  return {
    id: `${code}:${entityType}:${entityId ?? 'none'}:${relatedEntityIds.join(':')}`,
    code,
    category,
    severity,
    entityType,
    entityId,
    relatedEntityIds,
    messageKey: `${issueMessagePrefix}.${code}`,
    params,
    confidence: roundScore(confidence)
  };
}

function severityRank(severity: PlanningIssueDto['severity']) {
  if (severity === 'CRITICAL') return 3;
  if (severity === 'WARNING') return 2;
  return 1;
}

function buildScoreDimension(
  key: PlanningScoreDimensionDto['key'],
  score: number,
  signals: string[]
): PlanningScoreDimensionDto {
  return {
    key,
    score: Math.round(Math.max(0, Math.min(100, score))),
    maxScore: 100,
    explanationKey: `trip.editor.insights.score.dimensions.${key}`,
    signals
  };
}

function buildCategoryBreakdown(expenses: SnapshotExpense[], spentAmount: number) {
  const categoryGroups = groupBy(expenses, (expense) => expense.categoryId ?? 'uncategorized');

  return Array.from(categoryGroups.entries())
    .map(([categoryId, categoryExpenses]) => {
      const amount = categoryExpenses.reduce(
        (total, expense) => total + toNumber(expense.amount),
        0
      );
      const category = categoryExpenses[0]?.category;

      return {
        categoryId: categoryId === 'uncategorized' ? null : categoryId,
        categoryName: category?.name ?? 'Uncategorized',
        amount: roundMoney(amount),
        percentage: toPercentage(amount, spentAmount)
      };
    })
    .sort((left, right) => right.amount - left.amount);
}

function buildDailySpending(expenses: SnapshotExpense[]) {
  const daily = new Map<string, number>();

  for (const expense of expenses) {
    const date = (expense.spentAt ?? expense.createdAt).toISOString().slice(0, 10);
    daily.set(date, (daily.get(date) ?? 0) + toNumber(expense.amount));
  }

  return Array.from(daily.entries()).map(([date, amount]) => ({
    date,
    amount: roundMoney(amount)
  }));
}

function projectTripSpend(
  trip: TripSnapshot,
  dailySpending: Array<{ date: string; amount: number }>
) {
  if (!trip.startDate || !trip.endDate || dailySpending.length === 0) {
    return null;
  }

  const tripDays = Math.max(
    1,
    Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / 86_400_000) + 1
  );
  const averageDaily =
    dailySpending.reduce((total, day) => total + day.amount, 0) / dailySpending.length;

  return roundMoney(averageDaily * tripDays);
}

function buildBudgetRecommendations(input: {
  budgetLimit: number | null;
  spentAmount: number;
  usagePercentage: number | null;
  projectedOverspendAmount: number | null;
  uncategorizedCount: number;
}): PlanningBudgetInsightDto['recommendations'] {
  const recommendations: PlanningBudgetInsightDto['recommendations'] = [];

  if (input.budgetLimit === null) {
    recommendations.push({
      code: 'SET_TRIP_BUDGET',
      severity: 'INFO',
      params: {}
    });
  }
  if ((input.usagePercentage ?? 0) >= 90) {
    recommendations.push({
      code: 'REVIEW_HIGH_SPEND',
      severity: (input.usagePercentage ?? 0) > 100 ? 'WARNING' : 'INFO',
      params: { percentage: Math.round(input.usagePercentage ?? 0) }
    });
  }
  if ((input.projectedOverspendAmount ?? 0) > 0) {
    recommendations.push({
      code: 'PROJECTED_OVERSPEND',
      severity: 'WARNING',
      params: { amount: roundMoney(input.projectedOverspendAmount ?? 0) }
    });
  }
  if (input.uncategorizedCount > 0) {
    recommendations.push({
      code: 'CATEGORIZE_EXPENSES',
      severity: 'INFO',
      params: { count: input.uncategorizedCount }
    });
  }

  return recommendations;
}

function getOverlapMinutes(first: SnapshotItem, second: SnapshotItem) {
  if (!first.startsAt || !second.startsAt || first.durationMinutes === null) {
    return 0;
  }

  const firstEnd = first.startsAt.getTime() + Math.max(0, first.durationMinutes) * 60_000;
  const overlapMs = firstEnd - second.startsAt.getTime();

  return overlapMs > 0 ? Math.ceil(overlapMs / 60_000) : 0;
}

function getImpossibleGapMinutes(first: SnapshotItem, second: SnapshotItem, travelMinutes: number) {
  if (!first.startsAt || !second.startsAt || first.durationMinutes === null) {
    return 0;
  }

  const firstReadyAt = first.startsAt.getTime() + Math.max(0, first.durationMinutes) * 60_000;
  const availableMinutes = (second.startsAt.getTime() - firstReadyAt) / 60_000;
  const missingMinutes = travelMinutes - availableMinutes;

  return missingMinutes > 5 ? Math.ceil(missingMinutes) : 0;
}

function defaultDurationForItem(item: SnapshotItem) {
  const primaryType = item.types[0] ?? 'OTHER';
  return defaultDurationByType[primaryType] ?? defaultDurationByType.OTHER;
}

function getTripStartCursor(trip: TripSnapshot) {
  if (trip.startDate) {
    return new Date(`${trip.startDate.toISOString().slice(0, 10)}T09:00:00.000Z`);
  }

  return new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 9)
  );
}

function getLunchWindow(trip: TripSnapshot) {
  if (trip.startDate) {
    return new Date(`${trip.startDate.toISOString().slice(0, 10)}T12:30:00.000Z`);
  }

  return new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 12, 30)
  );
}

function sumLegDistance(legs: RouteLegEstimate[]) {
  return legs.reduce((total, leg) => total + leg.distanceMeters, 0);
}

function sumLegDuration(legs: RouteLegEstimate[]) {
  return legs.reduce((total, leg) => total + leg.durationMinutes, 0);
}

function countValues(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function facetsFromCounts(counts: Map<string, number>): PlanningFilterFacetDto[] {
  return Array.from(counts.entries())
    .map(([key, count]) => facet(key, count))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function facet(key: string, count: number): PlanningFilterFacetDto {
  return {
    key,
    count,
    params: { key }
  };
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
}

function toNumber(value: DecimalLike): number {
  return toNullableNumber(value) ?? 0;
}

function toNullableNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return value.toNumber();
}

function toPercentage(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function roundScore(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundCoordinate(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
