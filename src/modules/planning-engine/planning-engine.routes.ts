import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { planningEngineController } from './planning-engine.controller.js';
import { tripPlanningEngineSchema } from './planning-engine.schemas.js';

export const planningEngineRouter = Router();

planningEngineRouter.use(authenticate);
planningEngineRouter.get(
  '/trips/:tripId/planning',
  validateRequest(tripPlanningEngineSchema),
  asyncHandler(planningEngineController.getPlanning)
);
planningEngineRouter.get(
  '/trips/:tripId/planning/issues',
  validateRequest(tripPlanningEngineSchema),
  asyncHandler(planningEngineController.getIssues)
);
planningEngineRouter.get(
  '/trips/:tripId/planning/metrics',
  validateRequest(tripPlanningEngineSchema),
  asyncHandler(planningEngineController.getMetrics)
);
planningEngineRouter.get(
  '/trips/:tripId/planning/suggestions',
  validateRequest(tripPlanningEngineSchema),
  asyncHandler(planningEngineController.getSuggestions)
);
planningEngineRouter.get(
  '/trips/:tripId/planning/timeline',
  validateRequest(tripPlanningEngineSchema),
  asyncHandler(planningEngineController.getTimeline)
);
