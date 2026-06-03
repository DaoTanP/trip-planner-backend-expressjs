import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { budgetController } from '@/modules/budget/budget.controller.js';
import { tripBudgetSchema, upsertTripBudgetSchema } from '@/modules/budget/budget.schemas.js';

export const budgetRouter = Router();

budgetRouter.use(authenticate);
budgetRouter.get(
  '/trips/:tripId/budget',
  validateRequest(tripBudgetSchema),
  asyncHandler(budgetController.get)
);
budgetRouter.put(
  '/trips/:tripId/budget',
  validateRequest(upsertTripBudgetSchema),
  asyncHandler(budgetController.upsert)
);
