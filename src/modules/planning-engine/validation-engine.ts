import { millisecondsPerMinute, round } from './planning-engine.utils.js';
import type {
  BudgetModel,
  ConstraintResult,
  PlannerSnapshot,
  PlanningIssue,
  RouteModel,
  TimelineModel
} from './planning-engine.types.js';

export class ValidationEngine {
  validate(input: {
    trip: PlannerSnapshot;
    timeline: TimelineModel;
    route: RouteModel;
    budget: BudgetModel;
    constraints: ConstraintResult[];
  }): PlanningIssue[] {
    const issues: PlanningIssue[] = [];
    issues.push(...this.validateTrip(input.trip));
    issues.push(...this.validateTimeline(input.timeline, input.route));
    issues.push(...this.validateRoute(input.route));
    issues.push(...this.validateBudget(input.trip, input.budget));
    issues.push(...this.validateConstraints(input.constraints));

    return issues.sort(
      (first, second) => severityRank(second.severity) - severityRank(first.severity)
    );
  }

  private validateTrip(trip: PlannerSnapshot): PlanningIssue[] {
    if (trip.itineraryItems.length > 0) {
      return [];
    }

    return [
      issue({
        code: 'EMPTY_TRIP',
        severity: 'CRITICAL',
        category: 'TRIP',
        validation: 'TripValidation',
        entityType: 'TRIP',
        entityId: trip.id,
        affectedEntityIds: [],
        recommendedActionCode: 'ADD_STOP',
        params: {},
        confidence: 0.98
      })
    ];
  }

  private validateTimeline(timeline: TimelineModel, route: RouteModel): PlanningIssue[] {
    const issues: PlanningIssue[] = [];
    const unscheduled = timeline.segments.filter((segment) => !segment.scheduled);

    if (unscheduled.length > 0) {
      issues.push(
        issue({
          code: 'MISSING_SCHEDULE',
          severity: timeline.unscheduledItemCount === timeline.segments.length ? 'WARNING' : 'INFO',
          category: 'SCHEDULE',
          validation: 'ScheduleValidation',
          entityType: 'TRIP',
          entityId: null,
          affectedEntityIds: unscheduled.map((segment) => segment.itemId),
          recommendedActionCode: 'ADD_TIMES',
          params: { count: unscheduled.length },
          confidence: 0.92
        })
      );
    }

    for (let index = 0; index < timeline.segments.length; index += 1) {
      const segment = timeline.segments[index];
      const previous = timeline.segments[index - 1];
      if (!segment) continue;

      if (segment.duplicateVisit) {
        issues.push(
          issue({
            code: 'DUPLICATE_VISIT',
            severity: 'WARNING',
            category: 'TIMELINE',
            validation: 'TimelineValidation',
            entityType: 'PLACE',
            entityId: segment.placeId,
            affectedEntityIds: timeline.segments
              .filter((candidate) => candidate.placeId === segment.placeId)
              .map((candidate) => candidate.itemId),
            recommendedActionCode: 'MERGE_VISITS',
            params: {},
            confidence: 0.9
          })
        );
      }

      if (segment.timezoneMismatch) {
        issues.push(
          issue({
            code: 'TIMEZONE_INCONSISTENCY',
            severity: 'INFO',
            category: 'SCHEDULE',
            validation: 'ScheduleValidation',
            entityType: 'ITINERARY_ITEM',
            entityId: segment.itemId,
            affectedEntityIds: [segment.itemId],
            recommendedActionCode: 'REVIEW_TIMEZONE',
            params: { timezone: segment.timezone },
            confidence: 0.72
          })
        );
      }

      if (segment.lateNightArrival) {
        issues.push(
          issue({
            code: 'LATE_NIGHT_ARRIVAL',
            severity: 'INFO',
            category: 'SCHEDULE',
            validation: 'ScheduleValidation',
            entityType: 'ITINERARY_ITEM',
            entityId: segment.itemId,
            affectedEntityIds: [segment.itemId],
            recommendedActionCode: 'MOVE_EARLIER',
            params: {},
            confidence: 0.7
          })
        );
      }

      if (segment.idleGapBeforeMinutes !== null && segment.idleGapBeforeMinutes >= 240) {
        issues.push(
          issue({
            code: 'LARGE_IDLE_GAP',
            severity: 'INFO',
            category: 'TIMELINE',
            validation: 'TimelineValidation',
            entityType: 'ITINERARY_ITEM',
            entityId: segment.itemId,
            affectedEntityIds: previous ? [previous.itemId, segment.itemId] : [segment.itemId],
            recommendedActionCode: 'INSERT_BREAK',
            params: { minutes: segment.idleGapBeforeMinutes },
            confidence: 0.78
          })
        );
      }

      if (segment.overlapPreviousMinutes !== null && segment.overlapPreviousMinutes > 0) {
        issues.push(
          issue({
            code: 'OVERLAPPING_ACTIVITIES',
            severity: 'CRITICAL',
            category: 'SCHEDULE',
            validation: 'ScheduleValidation',
            entityType: 'ITINERARY_ITEM',
            entityId: segment.itemId,
            affectedEntityIds: previous ? [previous.itemId, segment.itemId] : [segment.itemId],
            recommendedActionCode: 'MOVE_LATER',
            params: { minutes: segment.overlapPreviousMinutes },
            confidence: 0.95
          })
        );
      }

      if (
        previous?.startsAtDate &&
        segment.startsAtDate &&
        segment.startsAtDate.getTime() < previous.startsAtDate.getTime()
      ) {
        issues.push(
          issue({
            code: 'BACKWARD_TIMELINE',
            severity: 'WARNING',
            category: 'TIMELINE',
            validation: 'TimelineValidation',
            entityType: 'ITINERARY_ITEM',
            entityId: segment.itemId,
            affectedEntityIds: [previous.itemId, segment.itemId],
            recommendedActionCode: 'REORDER_STOPS',
            params: {},
            confidence: 0.86
          })
        );
      }

      const routeSegment = route.segments.find(
        (candidate) => candidate.toItemId === segment.itemId
      );
      if (
        previous?.endsAtDate &&
        segment.startsAtDate &&
        routeSegment?.durationMinutes !== null &&
        routeSegment?.durationMinutes !== undefined
      ) {
        const availableMinutes = Math.round(
          (segment.startsAtDate.getTime() - previous.endsAtDate.getTime()) / millisecondsPerMinute
        );
        const deficitMinutes = Math.ceil(routeSegment.durationMinutes - availableMinutes);

        if (deficitMinutes > 0) {
          issues.push(
            issue({
              code: 'IMPOSSIBLE_TRAVEL',
              severity: 'CRITICAL',
              category: 'ROUTE',
              validation: 'RouteValidation',
              entityType: 'ROUTE_SEGMENT',
              entityId: routeSegment.id,
              affectedEntityIds: [routeSegment.fromItemId, routeSegment.toItemId],
              recommendedActionCode: 'ADD_TRAVEL_TIME',
              params: { minutes: deficitMinutes },
              confidence: 0.84
            })
          );
        }
      }
    }

    return dedupeIssues(issues);
  }

  private validateRoute(route: RouteModel): PlanningIssue[] {
    const issues: PlanningIssue[] = [];

    for (const segment of route.segments) {
      if (segment.unreachable) {
        issues.push(
          issue({
            code: 'MISSING_COORDINATES',
            severity: 'WARNING',
            category: 'ROUTE',
            validation: 'RouteValidation',
            entityType: 'ROUTE_SEGMENT',
            entityId: segment.id,
            affectedEntityIds: [segment.fromItemId, segment.toItemId],
            recommendedActionCode: 'RESOLVE_PLACE',
            params: {},
            confidence: 0.96
          })
        );
      }

      if (segment.longTransfer) {
        issues.push(
          issue({
            code:
              segment.distanceMeters !== null && segment.distanceMeters >= 70_000
                ? 'EXCESSIVE_TRAVEL'
                : 'LONG_TRANSFER',
            severity:
              segment.distanceMeters !== null && segment.distanceMeters >= 70_000
                ? 'CRITICAL'
                : 'WARNING',
            category: 'ROUTE',
            validation: 'RouteValidation',
            entityType: 'ROUTE_SEGMENT',
            entityId: segment.id,
            affectedEntityIds: [segment.fromItemId, segment.toItemId],
            recommendedActionCode: 'REORDER_STOPS',
            params: { distanceKm: Math.round((segment.distanceMeters ?? 0) / 1000) },
            confidence: 0.82
          })
        );
      }

      if (segment.travelMode === 'walking' && segment.walkingFeasible === false) {
        issues.push(
          issue({
            code: 'WALKING_NOT_FEASIBLE',
            severity: 'WARNING',
            category: 'ROUTE',
            validation: 'RouteValidation',
            entityType: 'ROUTE_SEGMENT',
            entityId: segment.id,
            affectedEntityIds: [segment.fromItemId, segment.toItemId],
            recommendedActionCode: 'CHANGE_TRANSPORT_MODE',
            params: { distanceKm: Math.round((segment.distanceMeters ?? 0) / 1000) },
            confidence: 0.88
          })
        );
      }
    }

    return issues;
  }

  private validateBudget(trip: PlannerSnapshot, budget: BudgetModel): PlanningIssue[] {
    const issues: PlanningIssue[] = [];

    if (budget.usagePercentage !== null && budget.usagePercentage > 100) {
      issues.push(
        issue({
          code: 'BUDGET_OVERSPEND',
          severity: 'WARNING',
          category: 'BUDGET',
          validation: 'BudgetValidation',
          entityType: 'BUDGET',
          entityId: trip.budget?.id ?? null,
          affectedEntityIds: trip.budget?.id ? [trip.budget.id] : [],
          recommendedActionCode: 'REVIEW_EXPENSES',
          params: { percentage: Math.round(budget.usagePercentage) },
          confidence: 0.94
        })
      );
    }

    for (const destination of budget.expensiveDestinations.slice(0, 3)) {
      if (destination.amount >= Math.max(100, (budget.spentAmount || 0) * 0.35)) {
        issues.push(
          issue({
            code: 'EXPENSIVE_DESTINATION',
            severity: 'INFO',
            category: 'BUDGET',
            validation: 'BudgetValidation',
            entityType: 'ITINERARY_ITEM',
            entityId: destination.itemId,
            affectedEntityIds: [destination.itemId],
            recommendedActionCode: 'REVIEW_DESTINATION_COST',
            params: { amount: round(destination.amount) },
            confidence: 0.68
          })
        );
      }
    }

    return issues;
  }

  private validateConstraints(constraints: ConstraintResult[]): PlanningIssue[] {
    return constraints
      .filter((constraint) => constraint.status === 'WARN' || constraint.status === 'FAIL')
      .map((constraint) =>
        issue({
          code: constraint.code,
          severity: constraint.severity,
          category: 'CONSTRAINT',
          validation: 'ConstraintValidation',
          entityType: 'TRIP',
          entityId: null,
          affectedEntityIds: constraint.affectedEntityIds,
          recommendedActionCode: constraintToActionCode(constraint.code),
          params: constraint.params,
          confidence: constraint.status === 'FAIL' ? 0.84 : 0.66
        })
      );
  }
}

function issue(input: {
  code: string;
  severity: PlanningIssue['severity'];
  category: PlanningIssue['category'];
  validation: PlanningIssue['validation'];
  entityType: PlanningIssue['entityType'];
  entityId: string | null;
  affectedEntityIds: string[];
  recommendedActionCode: string;
  params: Record<string, string | number | boolean>;
  confidence: number;
}): PlanningIssue {
  const affectedEntityIds = [...new Set(input.affectedEntityIds)];

  return {
    id: `${input.validation}:${input.code}:${input.entityId ?? 'trip'}:${affectedEntityIds.join(':')}`,
    code: input.code,
    severity: input.severity,
    category: input.category,
    validation: input.validation,
    entityType: input.entityType,
    entityId: input.entityId,
    affectedEntityIds,
    messageKey: `trip.editor.planning.issues.codes.${input.code}`,
    recommendedActionCode: input.recommendedActionCode,
    params: input.params,
    confidence: round(input.confidence)
  };
}

function dedupeIssues(issues: PlanningIssue[]) {
  const byId = new Map<string, PlanningIssue>();
  for (const nextIssue of issues) {
    byId.set(nextIssue.id, nextIssue);
  }

  return Array.from(byId.values());
}

function constraintToActionCode(code: string) {
  if (code === 'MAXIMUM_WALKING_DISTANCE') return 'CHANGE_TRANSPORT_MODE';
  if (code === 'MAXIMUM_DAILY_DRIVING') return 'ADD_REST';
  if (code === 'MEAL_WINDOW') return 'INSERT_LUNCH';
  if (code === 'MISSING_ACCOMMODATION') return 'INSERT_HOTEL';
  if (code === 'TIMEZONE_TRANSITION') return 'REVIEW_TIMEZONE';

  return 'REVIEW_CONSTRAINT';
}

function severityRank(severity: PlanningIssue['severity']) {
  if (severity === 'CRITICAL') return 3;
  if (severity === 'WARNING') return 2;
  return 1;
}

export const validationEngine = new ValidationEngine();
