import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { routesController } from '@/modules/routes/routes.controller.js';
import { listTripRoutesSchema } from '@/modules/routes/routes.schemas.js';

export const routesRouter = Router();

routesRouter.use(authenticate);
routesRouter.get(
  '/trips/:tripId/routes',
  validateRequest(listTripRoutesSchema),
  asyncHandler(routesController.list)
);
