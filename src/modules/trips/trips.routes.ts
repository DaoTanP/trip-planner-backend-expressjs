import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { tripsController } from '@/modules/trips/trips.controller.js';
import {
  createTripNoteSchema,
  createTripSchema,
  listTripsSchema,
  tripNoteIdSchema,
  tripIdSchema,
  updateTripNoteSchema,
  updateTripSchema
} from '@/modules/trips/trips.schemas.js';

export const tripsRouter = Router();

tripsRouter.use(authenticate);
tripsRouter.get('/', validateRequest(listTripsSchema), asyncHandler(tripsController.list));
tripsRouter.post('/', validateRequest(createTripSchema), asyncHandler(tripsController.create));
tripsRouter.get('/:tripId', validateRequest(tripIdSchema), asyncHandler(tripsController.get));
tripsRouter.patch(
  '/:tripId',
  validateRequest(updateTripSchema),
  asyncHandler(tripsController.update)
);
tripsRouter.delete('/:tripId', validateRequest(tripIdSchema), asyncHandler(tripsController.delete));
tripsRouter.post(
  '/:tripId/notes',
  validateRequest(createTripNoteSchema),
  asyncHandler(tripsController.createNote)
);
tripsRouter.patch(
  '/notes/:noteId',
  validateRequest(updateTripNoteSchema),
  asyncHandler(tripsController.updateNote)
);
tripsRouter.delete(
  '/notes/:noteId',
  validateRequest(tripNoteIdSchema),
  asyncHandler(tripsController.deleteNote)
);
