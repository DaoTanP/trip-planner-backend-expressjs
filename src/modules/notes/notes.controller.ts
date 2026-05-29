import type { Request, Response } from 'express';

import { serializeNote } from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.js';
import { sendCreated, sendCursorPaginated, sendSuccess } from '@/common/utils/response.js';
import { notesService, type NotesService } from '@/modules/notes/notes.service.js';
import type {
  CreateNoteInput,
  DeleteNoteQuery,
  ListNotesQuery,
  NoteIdParams,
  UpdateNoteInput
} from '@/modules/notes/notes.schemas.js';

const requireUser = (req: { user?: Request['user'] }): AuthenticatedUser => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user;
};

export class NotesController {
  constructor(private readonly service: NotesService = notesService) {}

  list = async (
    req: Request<Record<string, never>, unknown, unknown, ListNotesQuery>,
    res: Response
  ) => {
    const result = await this.service.listNotes(requireUser(req), req.query);
    return sendCursorPaginated(res, { notes: result.items.map(serializeNote) }, result.pagination);
  };

  create = async (req: Request<Record<string, never>, unknown, CreateNoteInput>, res: Response) => {
    const result = await this.service.createNote(requireUser(req), req.body);
    return sendCreated(res, {
      note: serializeNote(result.note),
      revision: result.revision.toString(),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };

  update = async (req: Request<NoteIdParams, unknown, UpdateNoteInput>, res: Response) => {
    const result = await this.service.updateNote(requireUser(req), req.params.noteId, req.body);
    return sendSuccess(res, {
      note: serializeNote(result.note),
      revision: result.revision.toString(),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };

  delete = async (req: Request<NoteIdParams, unknown, unknown, DeleteNoteQuery>, res: Response) => {
    const result = await this.service.deleteNote(requireUser(req), req.params.noteId, req.query);
    return sendSuccess(res, {
      note: serializeNote(result.note),
      revision: result.revision.toString(),
      ...(req.query.clientMutationId ? { clientMutationId: req.query.clientMutationId } : {})
    });
  };
}

export const notesController = new NotesController();
