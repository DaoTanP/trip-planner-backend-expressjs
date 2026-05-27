import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { itineraryController } from '@/modules/itinerary/itinerary.controller.js';
import {
  createTripItineraryItemSchema,
  itineraryItemIdSchema,
  listItinerarySchema,
  reorderItineraryItemsSchema,
  updateItineraryItemSchema
} from '@/modules/itinerary/itinerary.schemas.js';

export const itineraryRouter = Router();

itineraryRouter.use(authenticate);

itineraryRouter.get(
  '/trips/:tripId/itinerary',
  validateRequest(listItinerarySchema),
  asyncHandler(itineraryController.listItems)
);
itineraryRouter.post(
  '/trips/:tripId/itinerary',
  validateRequest(createTripItineraryItemSchema),
  asyncHandler(itineraryController.createTripItineraryItem)
);
itineraryRouter.patch(
  '/trips/:tripId/itinerary/reorder',
  validateRequest(reorderItineraryItemsSchema),
  asyncHandler(itineraryController.reorderItineraryItems)
);
itineraryRouter.get(
  '/trips/:tripId/places',
  validateRequest(listItinerarySchema),
  asyncHandler(itineraryController.listPlaces)
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
