import type { Request, Response } from 'express';

import { AuthError } from '@/common/errors/auth-error.js';
import { sendSuccess } from '@/common/utils/response.js';
import {
  planningIntelligenceService,
  type PlanningIntelligenceService
} from '@/modules/planning-intelligence/planning-intelligence.service.js';
import type {
  GetTripOptimizationQuery,
  OptimizeTripInput,
  TripPlanningIntelligenceParams
} from '@/modules/planning-intelligence/planning-intelligence.schemas.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class PlanningIntelligenceController {
  constructor(
    private readonly service: PlanningIntelligenceService = planningIntelligenceService
  ) {}

  getAnalysis = async (req: Request<TripPlanningIntelligenceParams>, res: Response) => {
    const analysis = await this.service.getAnalysis(requireUserId(req), req.params.tripId);
    return sendSuccess(res, { analysis });
  };

  getRecommendations = async (req: Request<TripPlanningIntelligenceParams>, res: Response) => {
    const recommendations = await this.service.getRecommendations(
      requireUserId(req),
      req.params.tripId
    );
    return sendSuccess(res, { recommendations });
  };

  getOptimization = async (
    req: Request<TripPlanningIntelligenceParams, unknown, unknown, GetTripOptimizationQuery>,
    res: Response
  ) => {
    const optimization = await this.service.getOptimization(
      requireUserId(req),
      req.params.tripId,
      req.query
    );
    return sendSuccess(res, { optimization });
  };

  getInsights = async (req: Request<TripPlanningIntelligenceParams>, res: Response) => {
    const insights = await this.service.getInsights(requireUserId(req), req.params.tripId);
    return sendSuccess(res, { insights });
  };

  optimizeTrip = async (
    req: Request<TripPlanningIntelligenceParams, unknown, OptimizeTripInput>,
    res: Response
  ) => {
    const optimization = await this.service.optimizeTrip(
      requireUserId(req),
      req.params.tripId,
      req.body
    );
    return sendSuccess(res, { optimization });
  };
}

export const planningIntelligenceController = new PlanningIntelligenceController();
