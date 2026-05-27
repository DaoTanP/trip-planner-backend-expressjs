import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { notesController } from '@/modules/notes/notes.controller.js';
import {
  createNoteSchema,
  listNotesSchema,
  noteIdSchema,
  updateNoteSchema
} from '@/modules/notes/notes.schemas.js';

export const notesRouter = Router();

notesRouter.use(authenticate);
notesRouter.get(
  '/trips/:tripId/notes',
  validateRequest(listNotesSchema),
  asyncHandler(notesController.list)
);
notesRouter.post(
  '/trips/:tripId/notes',
  validateRequest(createNoteSchema),
  asyncHandler(notesController.create)
);
notesRouter.patch(
  '/notes/:noteId',
  validateRequest(updateNoteSchema),
  asyncHandler(notesController.update)
);
notesRouter.delete(
  '/notes/:noteId',
  validateRequest(noteIdSchema),
  asyncHandler(notesController.delete)
);
