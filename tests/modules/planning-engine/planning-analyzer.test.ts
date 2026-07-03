import { planningAnalyzer } from '@/modules/planning-engine/planning-analyzer.js';
import type {
  PlanningSnapshotItem,
  PlanningTripSnapshot
} from '@/modules/planning-intelligence/planning-intelligence.repository.js';

const baseDate = new Date('2026-05-01T09:00:00.000Z');

describe('planning analyzer', () => {
  it('builds deterministic read models for a large itinerary', () => {
    const trip = buildTripSnapshot({
      itineraryItems: Array.from({ length: 1000 }, (_, index) =>
        buildItem({
          id: `item-${index}`,
          placeId: `place-${index}`,
          latitude: index === 500 ? null : 10 + index * 0.001,
          longitude: index === 500 ? null : 106 + index * 0.001,
          startsAt: index % 10 === 0 ? null : new Date(baseDate.getTime() + index * 90 * 60_000),
          timezone: index === 250 ? 'Asia/Tokyo' : 'Asia/Ho_Chi_Minh'
        })
      ),
      budget: {
        id: 'budget-1',
        currency: 'USD',
        totalLimit: 100
      },
      expenses: [
        {
          id: 'expense-1',
          categoryId: null,
          itineraryItemId: 'item-3',
          title: 'Tickets',
          amount: 180,
          currency: 'USD',
          paidByUserId: 'user-1',
          spentAt: baseDate,
          createdAt: baseDate,
          category: null
        }
      ]
    });

    const planning = planningAnalyzer.analyze(trip);
    const issueCodes = planning.issues.map((issue) => issue.code);

    expect(planning.timeline.segments).toHaveLength(1000);
    expect(planning.route.segments).toHaveLength(999);
    expect(planning.metrics.map((metric) => metric.key)).toEqual(
      expect.arrayContaining(['scheduledRatio', 'travelRatio', 'budgetUsage'])
    );
    expect(issueCodes).toEqual(
      expect.arrayContaining([
        'MISSING_SCHEDULE',
        'TIMEZONE_INCONSISTENCY',
        'MISSING_COORDINATES',
        'BUDGET_OVERSPEND'
      ])
    );
  });

  it('returns preview-only suggestions without mutating itinerary order', () => {
    const trip = buildTripSnapshot({
      itineraryItems: [
        buildItem({ id: 'a', placeId: 'a', latitude: 0, longitude: 0, startsAt: baseDate }),
        buildItem({
          id: 'c',
          placeId: 'c',
          latitude: 0,
          longitude: 2,
          startsAt: new Date('2026-05-01T10:00:00.000Z')
        }),
        buildItem({
          id: 'b',
          placeId: 'b',
          latitude: 0,
          longitude: 1,
          startsAt: new Date('2026-05-01T10:30:00.000Z')
        })
      ]
    });
    const originalOrder = trip.itineraryItems.map((item) => item.id);

    const planning = planningAnalyzer.analyze(trip);

    expect(planning.suggestions.some((suggestion) => suggestion.type === 'REORDER_STOPS')).toBe(
      true
    );
    expect(trip.itineraryItems.map((item) => item.id)).toEqual(originalOrder);
  });
});

function buildTripSnapshot(overrides: Partial<PlanningTripSnapshot> = {}): PlanningTripSnapshot {
  return {
    id: 'trip-1',
    title: 'Planner test',
    startDate: baseDate,
    endDate: new Date('2026-05-03T09:00:00.000Z'),
    timezone: 'Asia/Ho_Chi_Minh',
    status: 'PLANNING',
    preferences: null,
    revision: 9,
    itineraryItems: [],
    routePreferences: [],
    budget: null,
    expenseCategories: [],
    expenses: [],
    notes: [],
    collaborators: [],
    mutationEvents: [],
    ...overrides
  };
}

function buildItem(input: {
  id: string;
  placeId: string;
  latitude: number | null;
  longitude: number | null;
  startsAt: Date | null;
  timezone?: string;
}): PlanningSnapshotItem {
  return {
    id: input.id,
    tripId: 'trip-1',
    placeId: input.placeId,
    types: ['ACTIVITY'],
    summary: null,
    sortOrder: Number(input.id.replace(/\D/g, '') || 0),
    startsAt: input.startsAt,
    durationMinutes: 60,
    status: 'PLANNED',
    timezone: input.timezone ?? 'Asia/Ho_Chi_Minh',
    version: 1,
    createdAt: baseDate,
    updatedAt: baseDate,
    place: {
      id: input.placeId,
      name: `Place ${input.placeId}`,
      formattedAddress: null,
      countryCode: null,
      latitude: input.latitude,
      longitude: input.longitude,
      categories: [],
      timezone: input.timezone ?? 'Asia/Ho_Chi_Minh'
    }
  };
}
