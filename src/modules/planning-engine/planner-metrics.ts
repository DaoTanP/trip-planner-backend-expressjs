import type { PlanningEngineMetricDto } from '@/api/contracts/index.js';
import {
  getDateKey,
  getTripDurationDays,
  groupBy,
  round,
  toNumber,
  toPercentage
} from './planning-engine.utils.js';
import type {
  BudgetModel,
  MetricModel,
  PlannerSnapshot,
  RouteModel,
  TimelineModel
} from './planning-engine.types.js';

export class PlannerMetrics {
  buildBudget(trip: PlannerSnapshot): BudgetModel {
    const spentAmount = round(
      trip.expenses.reduce((total, expense) => total + toNumber(expense.amount), 0)
    );
    const budgetLimit = trip.budget ? toNumber(trip.budget.totalLimit) : null;
    const currency = trip.budget?.currency ?? trip.expenses[0]?.currency ?? null;
    const dailySpend = Array.from(
      groupBy(trip.expenses, (expense) => getDateKey(expense.spentAt ?? expense.createdAt))
    )
      .map(([date, expenses]) => ({
        date,
        amount: round(expenses.reduce((total, expense) => total + toNumber(expense.amount), 0))
      }))
      .sort((first, second) => first.date.localeCompare(second.date));
    const expensiveDestinations = Array.from(
      groupBy(trip.expenses, (expense) => expense.itineraryItemId).entries()
    )
      .map(([itemId, expenses]) => ({
        itemId,
        amount: round(expenses.reduce((total, expense) => total + toNumber(expense.amount), 0))
      }))
      .filter((entry) => entry.amount > 0)
      .sort((first, second) => second.amount - first.amount)
      .slice(0, 5);

    return {
      currency,
      spentAmount,
      budgetLimit,
      remainingAmount: budgetLimit === null ? null : round(budgetLimit - spentAmount),
      usagePercentage:
        budgetLimit && budgetLimit > 0 ? round((spentAmount / budgetLimit) * 100) : null,
      dailySpend,
      expensiveDestinations
    };
  }

  buildMetrics(
    trip: PlannerSnapshot,
    timeline: TimelineModel,
    route: RouteModel,
    budget: BudgetModel
  ): MetricModel[] {
    const itemCount = trip.itineraryItems.length;
    const scheduledRatio = itemCount === 0 ? 0 : timeline.scheduledItemCount / itemCount;
    const activityMinutes = timeline.segments.reduce(
      (total, segment) => total + segment.durationMinutes,
      0
    );
    const totalModeledMinutes = activityMinutes + route.totalDurationMinutes;
    const walkingDistance = route.segments
      .filter((segment) => segment.travelMode === 'walking')
      .reduce((total, segment) => total + (segment.distanceMeters ?? 0), 0);
    const itemTypes = new Set(trip.itineraryItems.flatMap((item) => item.types));
    const placeIds = new Set(trip.itineraryItems.map((item) => item.placeId));
    const idleGapMinutes = timeline.segments.reduce(
      (total, segment) => total + (segment.idleGapBeforeMinutes ?? 0),
      0
    );

    return [
      metric('tripDurationDays', getTripDurationDays(trip), 'days'),
      metric('scheduledRatio', round(scheduledRatio * 100), 'percent'),
      metric('unscheduledRatio', round((1 - scheduledRatio) * 100), 'percent'),
      metric(
        'travelRatio',
        totalModeledMinutes > 0
          ? round((route.totalDurationMinutes / totalModeledMinutes) * 100)
          : 0,
        'percent'
      ),
      metric(
        'activityRatio',
        totalModeledMinutes > 0 ? round((activityMinutes / totalModeledMinutes) * 100) : 0,
        'percent'
      ),
      metric('walkingRatio', toPercentage(walkingDistance, route.totalDistanceMeters), 'percent'),
      metric('budgetUsage', budget.usagePercentage ?? 0, 'percent'),
      metric('placeDiversity', toPercentage(placeIds.size, itemCount), 'percent'),
      metric('categoryDiversity', itemTypes.size, 'count'),
      metric('totalTravelDistance', route.totalDistanceMeters, 'meters'),
      metric('totalTravelDuration', route.totalDurationMinutes, 'minutes'),
      metric('idleGapMinutes', idleGapMinutes, 'minutes')
    ];
  }
}

function metric(
  key: PlanningEngineMetricDto['key'],
  value: number,
  unit: PlanningEngineMetricDto['unit']
): PlanningEngineMetricDto {
  return {
    key,
    value: round(value),
    unit,
    explanationKey: `trip.editor.planning.metrics.explanations.${key}`
  };
}

export const plannerMetrics = new PlannerMetrics();
