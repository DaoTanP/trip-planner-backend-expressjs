import type {
  PlanningAnalysisDto,
  PlanningOptimizationStrategyDto,
  PlanningTravelModeDto
} from '@/api/contracts/index.js';
import { logger } from '@/common/logger/logger.js';
import {
  collaborationPresenceService,
  type CollaborationPresenceService
} from '@/modules/collaboration/presence/presence.service.js';
import {
  buildPlanningAnalysis,
  toPlanningInsights,
  toPlanningRecommendations
} from '@/modules/planning-intelligence/planning-intelligence.engine.js';
import {
  planningIntelligenceCache,
  type PlanningIntelligenceCache
} from '@/modules/planning-intelligence/planning-intelligence.cache.js';
import {
  planningIntelligenceRepository,
  type PlanningIntelligenceRepository
} from '@/modules/planning-intelligence/planning-intelligence.repository.js';
import type {
  GetTripOptimizationQuery,
  OptimizeTripInput
} from '@/modules/planning-intelligence/planning-intelligence.schemas.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';

export class PlanningIntelligenceService {
  constructor(
    private readonly repository: PlanningIntelligenceRepository = planningIntelligenceRepository,
    private readonly trips: TripsService = tripsService,
    private readonly presence: CollaborationPresenceService = collaborationPresenceService,
    private readonly cache: PlanningIntelligenceCache = planningIntelligenceCache
  ) {}

  async getAnalysis(userId: string, tripId: string) {
    return this.getAnalysisForTrip(userId, tripId);
  }

  async getRecommendations(userId: string, tripId: string) {
    const analysis = await this.getAnalysisForTrip(userId, tripId);

    return toPlanningRecommendations(analysis);
  }

  async getInsights(userId: string, tripId: string) {
    const analysis = await this.getAnalysisForTrip(userId, tripId);

    return toPlanningInsights(analysis);
  }

  async getOptimization(userId: string, tripId: string, query: GetTripOptimizationQuery) {
    const analysis = await this.getAnalysisForTrip(userId, tripId, {
      strategy: query.strategy,
      travelMode: query.travelMode
    });

    return analysis.optimization;
  }

  async optimizeTrip(userId: string, tripId: string, input: OptimizeTripInput) {
    const analysis = await this.getAnalysisForTrip(userId, tripId, {
      strategy: input.strategy,
      travelMode: input.travelMode,
      fixedStartItemId: input.fixedStartItemId,
      fixedEndItemId: input.fixedEndItemId
    });

    return analysis.optimization;
  }

  private async getAnalysisForTrip(
    userId: string,
    tripId: string,
    options: {
      strategy?: PlanningOptimizationStrategyDto | undefined;
      travelMode?: PlanningTravelModeDto | undefined;
      fixedStartItemId?: string | null | undefined;
      fixedEndItemId?: string | null | undefined;
    } = {}
  ): Promise<PlanningAnalysisDto> {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    const snapshot = await this.repository.getSnapshot(tripId);
    if (!snapshot) {
      throw new NotFoundError({ resourceKey: 'resources.trip' });
    }

    const cacheKey = this.getCacheKey(tripId, snapshot.revision.toString(), options);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const presence = await this.getPresenceSafely(tripId);
    const analysis = buildPlanningAnalysis(snapshot, presence, options);
    this.cache.set(cacheKey, analysis);

    return analysis;
  }

  private async getPresenceSafely(tripId: string) {
    try {
      return (await this.presence.getSnapshot(tripId)).presences;
    } catch (error) {
      logger.warn({ err: error, tripId }, 'Planning intelligence presence snapshot unavailable');
      return [];
    }
  }

  private getCacheKey(
    tripId: string,
    revision: string,
    options: {
      strategy?: PlanningOptimizationStrategyDto | undefined;
      travelMode?: PlanningTravelModeDto | undefined;
      fixedStartItemId?: string | null | undefined;
      fixedEndItemId?: string | null | undefined;
    }
  ) {
    return [
      tripId,
      revision,
      options.strategy ?? 'default',
      options.travelMode ?? 'default',
      options.fixedStartItemId ?? 'none',
      options.fixedEndItemId ?? 'none'
    ].join(':');
  }
}

export const planningIntelligenceService = new PlanningIntelligenceService();
