import type { Prisma } from '@prisma/client';

import { ConflictError } from '@/common/errors/conflict-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { normalizeCursorLimit } from '@/common/utils/cursor-pagination.js';
import { notesRepository, type NotesRepository } from '@/modules/notes/notes.repository.js';
import type {
  CreateNoteInput,
  ListNotesQuery,
  NoteTargetEntityType,
  UpdateNoteInput
} from '@/modules/notes/notes.schemas.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

export class NotesService {
  constructor(
    private readonly repository: NotesRepository = notesRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async listNotes(userId: string, tripId: string, query: ListNotesQuery) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    return this.repository.listForTrip(tripId, {
      cursor: query.cursor,
      limit: normalizeCursorLimit(query.limit),
      targetEntityType: query.targetEntityType,
      targetEntityId: query.targetEntityId
    });
  }

  async createNote(userId: string, tripId: string, input: CreateNoteInput) {
    await this.trips.ensureCanEditTrip(userId, tripId);

    const targetEntityType = input.targetEntityType ?? 'TRIP';
    const targetEntityId = input.targetEntityId ?? tripId;
    await this.ensureTargetBelongsToTrip(tripId, targetEntityType, targetEntityId);

    const data: Prisma.NoteUncheckedCreateInput = {
      tripId,
      authorId: userId,
      targetEntityType,
      targetEntityId,
      body: input.body
    };

    if (input.clientMutationId !== undefined) {
      data.lastClientMutationId = input.clientMutationId;
    }
    if (input.metadata !== undefined) {
      data.metadata = input.metadata;
    }

    return this.repository.createNote(data, {
      actorId: userId,
      clientMutationId: input.clientMutationId,
      operation: 'CREATE'
    });
  }

  async updateNote(userId: string, noteId: string, input: UpdateNoteInput) {
    const access = await this.repository.findNoteAccess(noteId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.note' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);

    if (input.expectedVersion !== undefined && input.expectedVersion !== access.version) {
      throw new ConflictError('Note version conflict');
    }

    const data: Prisma.NoteUpdateInput = {
      version: { increment: 1 }
    };

    if (input.clientMutationId !== undefined) {
      data.lastClientMutationId = input.clientMutationId;
    }
    if (input.body !== undefined) data.body = input.body;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    return this.repository.updateNote(noteId, data, {
      tripId: access.tripId,
      actorId: userId,
      clientMutationId: input.clientMutationId,
      operation: 'UPDATE'
    });
  }

  async deleteNote(
    userId: string,
    noteId: string,
    clientMutationId?: string | undefined
  ): Promise<void> {
    const access = await this.repository.findNoteAccess(noteId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.note' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);
    await this.repository.softDeleteNote(noteId, {
      tripId: access.tripId,
      actorId: userId,
      clientMutationId,
      operation: 'DELETE'
    });
  }

  private async ensureTargetBelongsToTrip(
    tripId: string,
    targetEntityType: NoteTargetEntityType,
    targetEntityId: string
  ) {
    const targetTripId = await this.repository.findTargetTripId(targetEntityType, targetEntityId);

    if (targetTripId !== tripId) {
      throw new ConflictError('Note target is outside this trip');
    }
  }
}

export const notesService = new NotesService();
