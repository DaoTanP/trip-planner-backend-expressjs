import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { tripsController } from '@/modules/trips/trips.controller.js';
import { tripNoteIdSchema, updateTripNoteSchema } from '@/modules/trips/trips.schemas.js';

export const tripNotesRouter = Router();

tripNotesRouter.use(authenticate);
tripNotesRouter.patch(
  '/:noteId',
  validateRequest(updateTripNoteSchema),
  asyncHandler(tripsController.updateNote)
);
tripNotesRouter.delete(
  '/:noteId',
  validateRequest(tripNoteIdSchema),
  asyncHandler(tripsController.deleteNote)
);
