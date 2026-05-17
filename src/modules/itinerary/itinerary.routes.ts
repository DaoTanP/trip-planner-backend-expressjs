import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { itineraryController } from '@/modules/itinerary/itinerary.controller.js';
import {
  activityIdSchema,
  createActivitySchema,
  createDaySchema,
  listDaysSchema,
  updateActivitySchema
} from '@/modules/itinerary/itinerary.schemas.js';

export const itineraryRouter = Router();

itineraryRouter.use(authenticate);
itineraryRouter.get(
  '/trips/:tripId/days',
  validateRequest(listDaysSchema),
  asyncHandler(itineraryController.listDays)
);
itineraryRouter.post(
  '/trips/:tripId/days',
  validateRequest(createDaySchema),
  asyncHandler(itineraryController.createDay)
);
itineraryRouter.post(
  '/days/:dayId/activities',
  validateRequest(createActivitySchema),
  asyncHandler(itineraryController.createActivity)
);
itineraryRouter.patch(
  '/activities/:activityId',
  validateRequest(updateActivitySchema),
  asyncHandler(itineraryController.updateActivity)
);
itineraryRouter.delete(
  '/activities/:activityId',
  validateRequest(activityIdSchema),
  asyncHandler(itineraryController.deleteActivity)
);
