import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { syncController } from '@/modules/sync/sync.controller.js';
import { listMutationEventsSchema } from '@/modules/sync/sync.schemas.js';

export const syncRouter = Router();

syncRouter.use(authenticate);
syncRouter.get(
  '/trips/:tripId/mutation-events',
  validateRequest(listMutationEventsSchema),
  asyncHandler(syncController.listMutationEvents)
);
