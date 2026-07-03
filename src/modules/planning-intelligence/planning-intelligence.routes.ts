import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { planningIntelligenceController } from '@/modules/planning-intelligence/planning-intelligence.controller.js';
import {
  getTripOptimizationSchema,
  optimizeTripSchema,
  tripPlanningIntelligenceSchema
} from '@/modules/planning-intelligence/planning-intelligence.schemas.js';

export const planningIntelligenceRouter = Router();

planningIntelligenceRouter.use(authenticate);
planningIntelligenceRouter.get(
  '/trips/:tripId/analysis',
  validateRequest(tripPlanningIntelligenceSchema),
  asyncHandler(planningIntelligenceController.getAnalysis)
);
planningIntelligenceRouter.get(
  '/trips/:tripId/recommendations',
  validateRequest(tripPlanningIntelligenceSchema),
  asyncHandler(planningIntelligenceController.getRecommendations)
);
planningIntelligenceRouter.get(
  '/trips/:tripId/optimization',
  validateRequest(getTripOptimizationSchema),
  asyncHandler(planningIntelligenceController.getOptimization)
);
planningIntelligenceRouter.get(
  '/trips/:tripId/insights',
  validateRequest(tripPlanningIntelligenceSchema),
  asyncHandler(planningIntelligenceController.getInsights)
);
planningIntelligenceRouter.post(
  '/trips/:tripId/optimize',
  validateRequest(optimizeTripSchema),
  asyncHandler(planningIntelligenceController.optimizeTrip)
);
