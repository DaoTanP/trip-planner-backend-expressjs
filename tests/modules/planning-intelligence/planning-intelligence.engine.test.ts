import { buildPlanningAnalysis } from '@/modules/planning-intelligence/planning-intelligence.engine.js';
import type {
  PlanningSnapshotItem,
  PlanningTripSnapshot
} from '@/modules/planning-intelligence/planning-intelligence.repository.js';

const baseDate = new Date('2026-04-10T09:00:00.000Z');

describe('planning intelligence engine', () => {
  it('builds preview-only route optimization and structured planning warnings', () => {
    const trip = buildTripSnapshot({
      itineraryItems: [
        buildItem({
          id: 'item-a',
          placeId: 'place-a',
          name: 'Start',
          latitude: 0,
          longitude: 0,
          startsAt: baseDate
        }),
        buildItem({
          id: 'item-c',
          placeId: 'place-c',
          name: 'Far middle',
          latitude: 0,
          longitude: 2,
          startsAt: new Date('2026-04-10T10:00:00.000Z')
        }),
        buildItem({
          id: 'item-b',
          placeId: 'place-b',
          name: 'Near middle',
          latitude: 0,
          longitude: 1,
          startsAt: null
        })
      ],
      budget: {
        id: 'budget-1',
        currency: 'USD',
        totalLimit: 100
      },
      expenses: [
        {
          id: 'expense-1',
          categoryId: null,
          itineraryItemId: 'item-a',
          title: 'Tickets',
          amount: 120,
          currency: 'USD',
          paidByUserId: 'user-1',
          spentAt: baseDate,
          createdAt: baseDate,
          category: null
        }
      ]
    });

    const originalOrder = trip.itineraryItems.map((item) => item.id);
    const analysis = buildPlanningAnalysis(trip, [], {
      strategy: 'SHORTEST_DISTANCE',
      travelMode: 'driving'
    });

    expect(analysis.tripId).toBe(trip.id);
    expect(analysis.optimization.current.itemIds).toEqual(['item-a', 'item-c', 'item-b']);
    expect(analysis.optimization.recommended.itemIds).toEqual(['item-a', 'item-b', 'item-c']);
    expect(analysis.optimization.savings.distanceMeters).toBeGreaterThan(100_000);
    expect(trip.itineraryItems.map((item) => item.id)).toEqual(originalOrder);

    expect(analysis.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['MISSING_SCHEDULE', 'INEFFICIENT_TRAVEL', 'BUDGET_OVERSPEND'])
    );
    expect(
      analysis.placeRecommendations.map((recommendation) => recommendation.reasonCode)
    ).toEqual(
      expect.arrayContaining(['missingFoodStop', 'missingLodgingStop', 'extendDenseCluster'])
    );
  });
});

function buildTripSnapshot(overrides: Partial<PlanningTripSnapshot> = {}): PlanningTripSnapshot {
  return {
    id: 'trip-1',
    title: 'Planning test trip',
    startDate: baseDate,
    endDate: new Date('2026-04-12T09:00:00.000Z'),
    timezone: 'UTC',
    status: 'PLANNING',
    preferences: null,
    revision: 7,
    itineraryItems: [],
    routePreferences: [],
    budget: null,
    expenseCategories: [],
    expenses: [],
    notes: [],
    collaborators: [
      {
        userId: 'user-1',
        role: 'OWNER',
        acceptedAt: baseDate,
        user: {
          id: 'user-1',
          name: 'Owner',
          avatarUrl: null
        }
      }
    ],
    mutationEvents: [],
    ...overrides
  };
}

function buildItem(input: {
  id: string;
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  startsAt: Date | null;
  types?: string[];
}): PlanningSnapshotItem {
  return {
    id: input.id,
    tripId: 'trip-1',
    placeId: input.placeId,
    types: input.types ?? ['ACTIVITY'],
    summary: null,
    sortOrder: 0,
    startsAt: input.startsAt,
    durationMinutes: 60,
    status: 'PLANNED',
    timezone: 'UTC',
    version: 1,
    createdAt: baseDate,
    updatedAt: baseDate,
    place: {
      id: input.placeId,
      name: input.name,
      formattedAddress: null,
      countryCode: null,
      latitude: input.latitude,
      longitude: input.longitude,
      categories: [],
      timezone: 'UTC'
    }
  };
}
