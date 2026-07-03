import type {
  PlanningEngineBudgetDto,
  PlanningEngineConstraintResultDto,
  PlanningEngineIssueDto,
  PlanningEngineMetricDto,
  PlanningEngineReadModelDto,
  PlanningEngineRouteDto,
  PlanningEngineSuggestionDto,
  PlanningEngineTimelineDto,
  PlanningEngineTimelineSegmentDto,
  PlanningTravelModeDto
} from '@/api/contracts/index.js';
import type {
  PlanningSnapshotItem,
  PlanningTripSnapshot
} from '@/modules/planning-intelligence/planning-intelligence.repository.js';

export type PlannerSnapshot = PlanningTripSnapshot;
export type PlannerItem = PlanningSnapshotItem;

export type PlannerCoordinate = {
  latitude: number;
  longitude: number;
};

export type PlannerContext = {
  generatedAt: string;
  travelMode: PlanningTravelModeDto;
};

export type TimelineSegmentModel = PlanningEngineTimelineSegmentDto & {
  item: PlannerItem;
  startsAtDate: Date | null;
  endsAtDate: Date | null;
  coordinate: PlannerCoordinate | null;
};

export type TimelineModel = PlanningEngineTimelineDto & {
  segments: TimelineSegmentModel[];
};

export type RouteModel = PlanningEngineRouteDto;
export type BudgetModel = PlanningEngineBudgetDto;
export type MetricModel = PlanningEngineMetricDto;
export type ConstraintResult = PlanningEngineConstraintResultDto;
export type PlanningIssue = PlanningEngineIssueDto;
export type PlanningSuggestion = PlanningEngineSuggestionDto;
export type PlanningEngineReadModel = PlanningEngineReadModelDto;
