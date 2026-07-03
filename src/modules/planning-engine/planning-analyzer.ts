import type { PlanningEngineHealthDto, PlanningTravelModeDto } from '@/api/contracts/index.js';
import { plannerMetrics, type PlannerMetrics } from './planner-metrics.js';
import { ruleEngine, type RuleEngine } from './rule-engine.js';
import { schedulingService, type SchedulingService } from './scheduling.service.js';
import { suggestionEngine, type SuggestionEngine } from './suggestion-engine.js';
import { travelEstimator, type TravelEstimator } from './travel-estimator.js';
import { validationEngine, type ValidationEngine } from './validation-engine.js';
import type {
  PlannerSnapshot,
  PlanningEngineReadModel,
  PlanningIssue
} from './planning-engine.types.js';

export class PlanningAnalyzer {
  constructor(
    private readonly scheduling: SchedulingService = schedulingService,
    private readonly travel: TravelEstimator = travelEstimator,
    private readonly metrics: PlannerMetrics = plannerMetrics,
    private readonly rules: RuleEngine = ruleEngine,
    private readonly validation: ValidationEngine = validationEngine,
    private readonly suggestions: SuggestionEngine = suggestionEngine
  ) {}

  analyze(
    trip: PlannerSnapshot,
    input: {
      travelMode?: PlanningTravelModeDto | undefined;
      generatedAt?: string | undefined;
    } = {}
  ): PlanningEngineReadModel {
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const travelMode = input.travelMode ?? 'mixed';
    const timeline = this.scheduling.buildTimeline(trip);
    const route = this.travel.estimateRoute(trip, travelMode);
    const budget = this.metrics.buildBudget(trip);
    const metrics = this.metrics.buildMetrics(trip, timeline, route, budget);
    const constraints = this.rules.evaluate(trip, timeline, route);
    const issues = this.validation.validate({ trip, timeline, route, budget, constraints });
    const suggestions = this.suggestions.generate({ trip, timeline, route, issues });

    return {
      tripId: trip.id,
      revision: trip.revision.toString(),
      generatedAt,
      health: buildHealth(issues),
      timeline: stripTimelineModel(timeline),
      route,
      budget,
      metrics,
      constraints,
      issues,
      suggestions
    };
  }
}

function buildHealth(issues: PlanningIssue[]): PlanningEngineHealthDto {
  const issueCounts = {
    INFO: issues.filter((issue) => issue.severity === 'INFO').length,
    WARNING: issues.filter((issue) => issue.severity === 'WARNING').length,
    CRITICAL: issues.filter((issue) => issue.severity === 'CRITICAL').length
  };
  const score = Math.max(
    0,
    100 - issueCounts.CRITICAL * 18 - issueCounts.WARNING * 8 - issueCounts.INFO * 2
  );

  return {
    status: score >= 80 ? 'HEALTHY' : score >= 55 ? 'NEEDS_ATTENTION' : 'AT_RISK',
    score,
    maxScore: 100,
    issueCounts
  };
}

function stripTimelineModel(timeline: ReturnType<SchedulingService['buildTimeline']>) {
  return {
    scheduledItemCount: timeline.scheduledItemCount,
    unscheduledItemCount: timeline.unscheduledItemCount,
    timezoneCount: timeline.timezoneCount,
    duplicatePlaceCount: timeline.duplicatePlaceCount,
    segments: timeline.segments.map((segment) => ({
      itemId: segment.itemId,
      placeId: segment.placeId,
      sequence: segment.sequence,
      sortOrder: segment.sortOrder,
      startsAt: segment.startsAt,
      endsAt: segment.endsAt,
      timezone: segment.timezone,
      durationMinutes: segment.durationMinutes,
      status: segment.status,
      types: segment.types,
      scheduled: segment.scheduled,
      timezoneMismatch: segment.timezoneMismatch,
      lateNightArrival: segment.lateNightArrival,
      duplicateVisit: segment.duplicateVisit,
      idleGapBeforeMinutes: segment.idleGapBeforeMinutes,
      overlapPreviousMinutes: segment.overlapPreviousMinutes
    }))
  };
}

export const planningAnalyzer = new PlanningAnalyzer();
