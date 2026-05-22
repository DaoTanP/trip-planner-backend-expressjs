import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { itineraryController } from '@/modules/itinerary/itinerary.controller.js';
import {
  createDaySchema,
  createItineraryItemSchema,
  dayIdSchema,
  itineraryItemIdSchema,
  listDaysSchema,
  reorderDaysSchema,
  reorderItineraryItemsSchema,
  updateDaySchema,
  updateItineraryItemSchema
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
itineraryRouter.patch(
  '/trips/:tripId/days/reorder',
  validateRequest(reorderDaysSchema),
  asyncHandler(itineraryController.reorderDays)
);
itineraryRouter.patch(
  '/trip-days/:dayId',
  validateRequest(updateDaySchema),
  asyncHandler(itineraryController.updateDay)
);
itineraryRouter.delete(
  '/trip-days/:dayId',
  validateRequest(dayIdSchema),
  asyncHandler(itineraryController.deleteDay)
);
itineraryRouter.post(
  '/trip-days/:dayId/itinerary-items',
  validateRequest(createItineraryItemSchema),
  asyncHandler(itineraryController.createItineraryItem)
);
itineraryRouter.patch(
  '/itinerary-items/:itemId',
  validateRequest(updateItineraryItemSchema),
  asyncHandler(itineraryController.updateItineraryItem)
);
itineraryRouter.delete(
  '/itinerary-items/:itemId',
  validateRequest(itineraryItemIdSchema),
  asyncHandler(itineraryController.deleteItineraryItem)
);
itineraryRouter.patch(
  '/trips/:tripId/itinerary-items/reorder',
  validateRequest(reorderItineraryItemsSchema),
  asyncHandler(itineraryController.reorderItineraryItems)
);

// Temporary compatibility aliases for early frontend callers while the editor migrates to item naming.
itineraryRouter.post(
  '/days/:dayId/activities',
  validateRequest(createItineraryItemSchema),
  asyncHandler(itineraryController.createItineraryItem)
);
itineraryRouter.patch(
  '/activities/:itemId',
  validateRequest(updateItineraryItemSchema),
  asyncHandler(itineraryController.updateItineraryItem)
);
itineraryRouter.delete(
  '/activities/:itemId',
  validateRequest(itineraryItemIdSchema),
  asyncHandler(itineraryController.deleteItineraryItem)
);
