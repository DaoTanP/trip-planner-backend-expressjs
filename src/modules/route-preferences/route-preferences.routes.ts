import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';

import { routePreferencesController } from './route-preferences.controller.js';
import {
  listTripRoutePreferencesSchema,
  upsertTripRoutePreferenceSchema
} from './route-preferences.schemas.js';

export const routePreferencesRouter = Router();

routePreferencesRouter.use(authenticate);

routePreferencesRouter.get(
  '/trips/:tripId/route-preferences',
  validateRequest(listTripRoutePreferencesSchema),
  asyncHandler(routePreferencesController.listTripRoutePreferences)
);

routePreferencesRouter.put(
  '/trips/:tripId/route-preferences/:fromItemId/:toItemId',
  validateRequest(upsertTripRoutePreferenceSchema),
  asyncHandler(routePreferencesController.upsertTripRoutePreference)
);
