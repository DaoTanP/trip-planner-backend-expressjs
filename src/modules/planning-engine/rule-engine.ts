import type {
  ConstraintResult,
  PlannerSnapshot,
  RouteModel,
  TimelineModel
} from './planning-engine.types.js';

const maximumWalkingDistanceMeters = 1_500;
const maximumDailyDrivingMinutes = 360;

export class RuleEngine {
  evaluate(trip: PlannerSnapshot, timeline: TimelineModel, route: RouteModel): ConstraintResult[] {
    return [
      this.maximumWalkingDistance(route),
      this.maximumDailyDriving(timeline, route),
      this.mealWindow(trip, timeline),
      this.missingAccommodation(trip),
      this.timezoneTransition(timeline),
      this.openingHoursFuture()
    ];
  }

  private maximumWalkingDistance(route: RouteModel): ConstraintResult {
    const affectedEntityIds = route.segments
      .filter(
        (segment) =>
          segment.travelMode === 'walking' &&
          segment.distanceMeters !== null &&
          segment.distanceMeters > maximumWalkingDistanceMeters
      )
      .flatMap((segment) => [segment.fromItemId, segment.toItemId]);

    return constraint({
      code: 'MAXIMUM_WALKING_DISTANCE',
      status:
        affectedEntityIds.length > 0
          ? 'FAIL'
          : route.segments.length > 0
            ? 'PASS'
            : 'NOT_APPLICABLE',
      severity: affectedEntityIds.length > 0 ? 'WARNING' : 'INFO',
      affectedEntityIds,
      params: { meters: maximumWalkingDistanceMeters }
    });
  }

  private maximumDailyDriving(timeline: TimelineModel, route: RouteModel): ConstraintResult {
    const drivingByDate = new Map<string, number>();

    for (const segment of route.segments) {
      if (segment.travelMode !== 'driving' || segment.durationMinutes === null) continue;

      const fromTimelineSegment = timeline.segments.find(
        (candidate) => candidate.itemId === segment.fromItemId
      );
      const date = fromTimelineSegment?.startsAt?.slice(0, 10);
      if (!date) continue;

      drivingByDate.set(date, (drivingByDate.get(date) ?? 0) + segment.durationMinutes);
    }

    const overloadedDates = Array.from(drivingByDate.entries()).filter(
      ([, minutes]) => minutes > maximumDailyDrivingMinutes
    );

    return constraint({
      code: 'MAXIMUM_DAILY_DRIVING',
      status:
        overloadedDates.length > 0 ? 'WARN' : drivingByDate.size > 0 ? 'PASS' : 'NOT_APPLICABLE',
      severity: overloadedDates.length > 0 ? 'WARNING' : 'INFO',
      affectedEntityIds: [],
      params: { minutes: maximumDailyDrivingMinutes, days: overloadedDates.length }
    });
  }

  private mealWindow(trip: PlannerSnapshot, timeline: TimelineModel): ConstraintResult {
    const scheduledDates = new Set(
      timeline.segments.map((segment) => segment.startsAt?.slice(0, 10)).filter(Boolean)
    );
    const foodDates = new Set(
      timeline.segments
        .filter((segment) => segment.types.includes('FOOD'))
        .map((segment) => segment.startsAt?.slice(0, 10))
        .filter(Boolean)
    );
    const missingFoodDays = Array.from(scheduledDates).filter((date) => !foodDates.has(date));

    return constraint({
      code: 'MEAL_WINDOW',
      status:
        missingFoodDays.length > 0
          ? 'WARN'
          : trip.itineraryItems.length > 0
            ? 'PASS'
            : 'NOT_APPLICABLE',
      severity: missingFoodDays.length > 0 ? 'INFO' : 'INFO',
      affectedEntityIds: [],
      params: { days: missingFoodDays.length }
    });
  }

  private missingAccommodation(trip: PlannerSnapshot): ConstraintResult {
    const tripSpansMultipleDays =
      trip.startDate !== null &&
      trip.endDate !== null &&
      trip.startDate.toISOString().slice(0, 10) !== trip.endDate.toISOString().slice(0, 10);
    const hasLodging = trip.itineraryItems.some((item) => item.types.includes('LODGING'));

    return constraint({
      code: 'MISSING_ACCOMMODATION',
      status:
        tripSpansMultipleDays && !hasLodging
          ? 'FAIL'
          : tripSpansMultipleDays
            ? 'PASS'
            : 'NOT_APPLICABLE',
      severity: tripSpansMultipleDays && !hasLodging ? 'WARNING' : 'INFO',
      affectedEntityIds: [],
      params: {}
    });
  }

  private timezoneTransition(timeline: TimelineModel): ConstraintResult {
    return constraint({
      code: 'TIMEZONE_TRANSITION',
      status:
        timeline.timezoneCount > 1
          ? 'WARN'
          : timeline.segments.length > 0
            ? 'PASS'
            : 'NOT_APPLICABLE',
      severity: timeline.timezoneCount > 1 ? 'INFO' : 'INFO',
      affectedEntityIds: timeline.segments
        .filter((segment) => segment.timezoneMismatch)
        .map((segment) => segment.itemId),
      params: { timezones: timeline.timezoneCount }
    });
  }

  private openingHoursFuture(): ConstraintResult {
    return constraint({
      code: 'OPENING_HOURS',
      status: 'NOT_APPLICABLE',
      severity: 'INFO',
      affectedEntityIds: [],
      params: { providerReady: false }
    });
  }
}

function constraint(input: {
  code: string;
  status: ConstraintResult['status'];
  severity: ConstraintResult['severity'];
  affectedEntityIds: string[];
  params: Record<string, string | number | boolean>;
}): ConstraintResult {
  return {
    id: `constraint:${input.code}`,
    code: input.code,
    status: input.status,
    severity: input.severity,
    affectedEntityIds: [...new Set(input.affectedEntityIds)],
    messageKey: `trip.editor.planning.constraints.codes.${input.code}`,
    params: input.params
  };
}

export const ruleEngine = new RuleEngine();
