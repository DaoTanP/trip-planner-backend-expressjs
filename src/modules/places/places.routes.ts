import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { placesController } from '@/modules/places/places.controller.js';
import {
  createPlaceSchema,
  listPlacesSchema,
  placeIdSchema,
  searchPlacesSchema
} from '@/modules/places/places.schemas.js';

export const placesRouter = Router();

placesRouter.use(authenticate);
placesRouter.get('/', validateRequest(listPlacesSchema), asyncHandler(placesController.list));
placesRouter.get(
  '/search',
  validateRequest(searchPlacesSchema),
  asyncHandler(placesController.search)
);
placesRouter.get('/:placeId', validateRequest(placeIdSchema), asyncHandler(placesController.get));
placesRouter.post('/', validateRequest(createPlaceSchema), asyncHandler(placesController.create));
