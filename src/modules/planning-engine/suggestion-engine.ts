import {
  estimateDurationMinutes,
  getItemCoordinate,
  getStoredTravelMode,
  haversineDistanceMeters,
  round
} from './planning-engine.utils.js';
import type {
  PlannerItem,
  PlannerSnapshot,
  PlanningIssue,
  PlanningSuggestion,
  RouteModel,
  TimelineModel
} from './planning-engine.types.js';

export class SuggestionEngine {
  generate(input: {
    trip: PlannerSnapshot;
    timeline: TimelineModel;
    route: RouteModel;
    issues: PlanningIssue[];
  }): PlanningSuggestion[] {
    const suggestions: PlanningSuggestion[] = [];
    suggestions.push(...this.issueDrivenSuggestions(input.timeline, input.issues));

    const reorderSuggestion = this.reorderSuggestion(input.trip, input.route, input.issues);
    if (reorderSuggestion) {
      suggestions.push(reorderSuggestion);
    }

    return dedupeSuggestions(suggestions)
      .sort((first, second) => second.confidence - first.confidence)
      .slice(0, 12);
  }

  private issueDrivenSuggestions(timeline: TimelineModel, issues: PlanningIssue[]) {
    const suggestions: PlanningSuggestion[] = [];

    for (const planningIssue of issues) {
      if (planningIssue.code === 'MISSING_SCHEDULE') {
        suggestions.push(
          suggestion({
            type: 'MOVE_EARLIER',
            reasonCode: 'scheduleUnscheduledItems',
            issue: planningIssue,
            confidence: 0.72,
            estimatedImprovement: { scoreDelta: 8 },
            preview: {}
          })
        );
      }

      if (
        planningIssue.code === 'OVERLAPPING_ACTIVITIES' ||
        planningIssue.code === 'IMPOSSIBLE_TRAVEL'
      ) {
        suggestions.push(
          suggestion({
            type: 'MOVE_LATER',
            reasonCode: 'resolveScheduleConflict',
            issue: planningIssue,
            confidence: 0.8,
            estimatedImprovement: { scheduleMinutes: numberParam(planningIssue.params.minutes) },
            preview: {}
          })
        );
      }

      if (planningIssue.code === 'LARGE_IDLE_GAP') {
        suggestions.push(
          suggestion({
            type: 'INSERT_BREAK',
            reasonCode: 'useIdleGap',
            issue: planningIssue,
            confidence: 0.64,
            estimatedImprovement: {
              scheduleMinutes: Math.min(90, numberParam(planningIssue.params.minutes))
            },
            preview: {
              insertAfterItemId: planningIssue.affectedEntityIds[0] ?? null,
              durationMinutes: 60
            }
          })
        );
      }

      if (planningIssue.code === 'MEAL_WINDOW') {
        suggestions.push(
          suggestion({
            type: 'INSERT_LUNCH',
            reasonCode: 'missingMealWindow',
            issue: planningIssue,
            confidence: 0.58,
            estimatedImprovement: { scoreDelta: 3 },
            preview: { durationMinutes: 75 }
          })
        );
      }

      if (planningIssue.code === 'MISSING_ACCOMMODATION') {
        suggestions.push(
          suggestion({
            type: 'INSERT_HOTEL',
            reasonCode: 'missingOvernightBase',
            issue: planningIssue,
            confidence: 0.7,
            estimatedImprovement: { scoreDelta: 5 },
            preview: { durationMinutes: 45 }
          })
        );
      }

      if (planningIssue.code === 'DUPLICATE_VISIT') {
        suggestions.push(
          suggestion({
            type: 'MERGE_NEARBY',
            reasonCode: 'mergeDuplicateVisit',
            issue: planningIssue,
            confidence: 0.74,
            estimatedImprovement: { scoreDelta: 4 },
            preview: {}
          })
        );
      }
    }

    const firstLateNight = timeline.segments.find((segment) => segment.lateNightArrival);
    if (firstLateNight) {
      const linkedIssue = issues.find(
        (planningIssue) => planningIssue.code === 'LATE_NIGHT_ARRIVAL'
      );
      if (linkedIssue) {
        suggestions.push(
          suggestion({
            type: 'MOVE_EARLIER',
            reasonCode: 'avoidLateArrival',
            issue: linkedIssue,
            confidence: 0.56,
            estimatedImprovement: { scheduleMinutes: 120 },
            preview: { insertAfterItemId: firstLateNight.itemId }
          })
        );
      }
    }

    return suggestions;
  }

  private reorderSuggestion(
    trip: PlannerSnapshot,
    route: RouteModel,
    issues: PlanningIssue[]
  ): PlanningSuggestion | null {
    if (
      trip.itineraryItems.length < 3 ||
      trip.itineraryItems.length > 300 ||
      route.totalDistanceMeters <= 0
    ) {
      return null;
    }

    const recommendedOrder = nearestNeighborOrder(trip.itineraryItems);
    if (recommendedOrder.length !== trip.itineraryItems.length) {
      return null;
    }

    const recommendedDistance = estimateOrderDistance(trip, recommendedOrder);
    const savings = route.totalDistanceMeters - recommendedDistance;
    if (savings < 2_000 || savings / route.totalDistanceMeters < 0.12) {
      return null;
    }

    const blockingIssueIds = issues
      .filter((planningIssue) => planningIssue.recommendedActionCode === 'REORDER_STOPS')
      .map((planningIssue) => planningIssue.id);

    return {
      id: 'suggestion:REORDER_STOPS:route',
      type: 'REORDER_STOPS',
      reasonCode: 'reduceTravelBacktracking',
      confidence: round(Math.min(0.9, 0.45 + savings / route.totalDistanceMeters)),
      affectedEntityIds: recommendedOrder,
      blockingIssueIds,
      estimatedImprovement: {
        distanceMeters: Math.round(savings),
        durationMinutes: Math.round(estimateDurationMinutes(savings, route.travelMode)),
        scoreDelta: 6
      },
      preview: {
        itemIds: recommendedOrder
      }
    };
  }
}

function suggestion(input: {
  type: PlanningSuggestion['type'];
  reasonCode: string;
  issue: PlanningIssue;
  confidence: number;
  estimatedImprovement: PlanningSuggestion['estimatedImprovement'];
  preview: PlanningSuggestion['preview'];
}): PlanningSuggestion {
  return {
    id: `suggestion:${input.type}:${input.issue.id}`,
    type: input.type,
    reasonCode: input.reasonCode,
    confidence: round(input.confidence),
    affectedEntityIds: input.issue.affectedEntityIds,
    blockingIssueIds: [input.issue.id],
    estimatedImprovement: input.estimatedImprovement,
    preview: input.preview
  };
}

function nearestNeighborOrder(items: PlannerItem[]) {
  const first = items[0];
  if (!first) return [];

  const remaining = new Map(items.map((item) => [item.id, item]));
  const order: PlannerItem[] = [first];
  remaining.delete(first.id);

  while (remaining.size > 0) {
    const current = order[order.length - 1];
    if (!current) break;

    let nearest: PlannerItem | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of remaining.values()) {
      const currentCoordinate = getItemCoordinate(current);
      const candidateCoordinate = getItemCoordinate(candidate);
      if (!currentCoordinate || !candidateCoordinate) continue;

      const distance = haversineDistanceMeters(currentCoordinate, candidateCoordinate);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }

    if (!nearest) return [];
    order.push(nearest);
    remaining.delete(nearest.id);
  }

  return order.map((item) => item.id);
}

function estimateOrderDistance(trip: PlannerSnapshot, itemIds: string[]) {
  const byId = new Map(trip.itineraryItems.map((item) => [item.id, item]));
  let total = 0;

  for (let index = 0; index < itemIds.length - 1; index += 1) {
    const from = byId.get(itemIds[index] ?? '');
    const to = byId.get(itemIds[index + 1] ?? '');
    const fromCoordinate = getItemCoordinate(from);
    const toCoordinate = getItemCoordinate(to);
    if (!from || !to || !fromCoordinate || !toCoordinate) continue;

    const mode = getStoredTravelMode(trip, from.id, to.id, 'mixed');
    total += haversineDistanceMeters(fromCoordinate, toCoordinate);
    void mode;
  }

  return Math.round(total);
}

function numberParam(value: string | number | boolean | undefined) {
  return typeof value === 'number' ? value : 0;
}

function dedupeSuggestions(suggestions: PlanningSuggestion[]) {
  const byId = new Map<string, PlanningSuggestion>();
  for (const nextSuggestion of suggestions) {
    byId.set(nextSuggestion.id, nextSuggestion);
  }

  return Array.from(byId.values());
}

export const suggestionEngine = new SuggestionEngine();
