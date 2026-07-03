import type { PlanningTravelModeDto } from '@/api/contracts/index.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import {
  planningIntelligenceRepository,
  type PlanningIntelligenceRepository
} from '@/modules/planning-intelligence/planning-intelligence.repository.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';
import { planningAnalyzer, type PlanningAnalyzer } from './planning-analyzer.js';
import { planningEngineCache, type PlanningEngineCache } from './planning-engine.cache.js';
import type { PlanningEngineReadModel } from './planning-engine.types.js';

export class PlanningEngineService {
  constructor(
    private readonly repository: PlanningIntelligenceRepository = planningIntelligenceRepository,
    private readonly trips: TripsService = tripsService,
    private readonly analyzer: PlanningAnalyzer = planningAnalyzer,
    private readonly cache: PlanningEngineCache = planningEngineCache
  ) {}

  async getPlanning(
    userId: string,
    tripId: string,
    input: { travelMode?: PlanningTravelModeDto | undefined } = {}
  ): Promise<PlanningEngineReadModel> {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    const snapshot = await this.repository.getSnapshot(tripId);
    if (!snapshot) {
      throw new NotFoundError({ resourceKey: 'resources.trip' });
    }

    const cacheKey = this.getCacheKey(tripId, snapshot.revision.toString(), input.travelMode);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const planning = this.analyzer.analyze(snapshot, { travelMode: input.travelMode });
    this.cache.set(cacheKey, planning);

    return planning;
  }

  async getIssues(
    userId: string,
    tripId: string,
    input: { travelMode?: PlanningTravelModeDto | undefined } = {}
  ) {
    return (await this.getPlanning(userId, tripId, input)).issues;
  }

  async getMetrics(
    userId: string,
    tripId: string,
    input: { travelMode?: PlanningTravelModeDto | undefined } = {}
  ) {
    return (await this.getPlanning(userId, tripId, input)).metrics;
  }

  async getSuggestions(
    userId: string,
    tripId: string,
    input: { travelMode?: PlanningTravelModeDto | undefined } = {}
  ) {
    return (await this.getPlanning(userId, tripId, input)).suggestions;
  }

  async getTimeline(
    userId: string,
    tripId: string,
    input: { travelMode?: PlanningTravelModeDto | undefined } = {}
  ) {
    return (await this.getPlanning(userId, tripId, input)).timeline;
  }

  private getCacheKey(
    tripId: string,
    revision: string,
    travelMode: PlanningTravelModeDto | undefined
  ) {
    return [tripId, revision, travelMode ?? 'mixed'].join(':');
  }
}

export const planningEngineService = new PlanningEngineService();
