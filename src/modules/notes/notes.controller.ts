import type { Request, Response } from 'express';

import { serializeNote } from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import {
  sendCreated,
  sendCursorPaginated,
  sendNoContent,
  sendSuccess
} from '@/common/utils/response.js';
import { notesService, type NotesService } from '@/modules/notes/notes.service.js';
import type {
  CreateNoteInput,
  CreateNoteParams,
  ListNotesParams,
  ListNotesQuery,
  NoteIdParams,
  UpdateNoteInput
} from '@/modules/notes/notes.schemas.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class NotesController {
  constructor(private readonly service: NotesService = notesService) {}

  list = async (req: Request<ListNotesParams, unknown, unknown, ListNotesQuery>, res: Response) => {
    const result = await this.service.listNotes(requireUserId(req), req.params.tripId, req.query);
    return sendCursorPaginated(res, { notes: result.items.map(serializeNote) }, result.pagination);
  };

  create = async (req: Request<CreateNoteParams, unknown, CreateNoteInput>, res: Response) => {
    const note = await this.service.createNote(requireUserId(req), req.params.tripId, req.body);
    return sendCreated(res, {
      note: serializeNote(note),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };

  update = async (req: Request<NoteIdParams, unknown, UpdateNoteInput>, res: Response) => {
    const note = await this.service.updateNote(requireUserId(req), req.params.noteId, req.body);
    return sendSuccess(res, {
      note: serializeNote(note),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };

  delete = async (req: Request<NoteIdParams>, res: Response) => {
    await this.service.deleteNote(requireUserId(req), req.params.noteId);
    return sendNoContent(res);
  };
}

export const notesController = new NotesController();
