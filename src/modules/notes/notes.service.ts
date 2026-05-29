import type { Prisma } from '@prisma/client';

import { ConflictError } from '@/common/errors/conflict-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import type { AuthenticatedUser } from '@/common/types/authenticated-user.js';
import { normalizeCursorLimit } from '@/common/utils/cursor-pagination.js';
import {
  collaborationService,
  type CollaborationService
} from '@/modules/collaboration/collaboration.service.js';
import { notesRepository, type NotesRepository } from '@/modules/notes/notes.repository.js';
import type {
  CreateNoteInput,
  DeleteNoteQuery,
  ListNotesQuery,
  UpdateNoteInput
} from '@/modules/notes/notes.schemas.js';
import { ensureIdempotentMutation } from '@/modules/sync/idempotency.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

export class NotesService {
  constructor(
    private readonly repository: NotesRepository = notesRepository,
    private readonly trips: TripsService = tripsService,
    private readonly collaboration: CollaborationService = collaborationService
  ) {}

  async listNotes(actor: AuthenticatedUser, query: ListNotesQuery) {
    if (!query.tripId && (!query.targetEntityType || !query.targetEntityId)) {
      throw new ConflictError('Notes require a trip or target filter');
    }

    if (query.tripId) {
      await this.trips.ensureCanAccessTrip(actor.id, query.tripId, actor.role);
    }

    if (query.targetEntityType && query.targetEntityId) {
      await this.collaboration.resolveWritableTarget(
        actor,
        query.targetEntityType,
        query.targetEntityId,
        query.tripId
      );
    }

    return this.repository.list({
      cursor: query.cursor,
      limit: normalizeCursorLimit(query.limit),
      tripId: query.tripId,
      targetEntityType: query.targetEntityType,
      targetEntityId: query.targetEntityId,
      parentNoteId: query.parentNoteId
    });
  }

  async createNote(actor: AuthenticatedUser, input: CreateNoteInput) {
    const target = await this.collaboration.resolveWritableTarget(
      actor,
      input.targetEntityType,
      input.targetEntityId,
      input.tripId
    );
    const replay = await ensureIdempotentMutation(
      target.tripId,
      input.clientMutationId,
      async (mutation) => {
        if (!mutation.entityId) return null;

        const note = await this.repository.findNoteById(mutation.entityId);
        return note ? { note, revision: mutation.revision } : null;
      }
    );

    if (replay) {
      return replay;
    }

    await this.trips.ensureExpectedRevision(target.tripId, input.expectedRevision);

    if (input.parentNoteId) {
      await this.ensureParentMatchesTarget(input.parentNoteId, target);
    }

    const data: Prisma.NoteUncheckedCreateInput = {
      tripId: target.tripId,
      authorId: actor.id,
      targetEntityType: target.targetEntityType,
      targetEntityId: target.targetEntityId,
      body: input.body
    };

    if (input.parentNoteId !== undefined) data.parentNoteId = input.parentNoteId;
    if (input.clientMutationId !== undefined) data.lastClientMutationId = input.clientMutationId;
    if (input.mentions !== undefined) data.mentions = input.mentions;
    if (input.attachments !== undefined) data.attachments = input.attachments;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    return this.repository.createNote(data, {
      tripId: target.tripId,
      actorId: actor.id,
      deviceId: input.deviceId,
      clientMutationId: input.clientMutationId,
      operation: 'ENTITY_CREATED'
    });
  }

  async updateNote(actor: AuthenticatedUser, noteId: string, input: UpdateNoteInput) {
    const access = await this.repository.findNoteAccess(noteId);
    if (!access || access.deletedAt) {
      throw new NotFoundError({ resourceKey: 'resources.note' });
    }

    await this.collaboration.ensureCanManageNote(actor, access);

    if (!access.tripId) {
      throw new ConflictError('Note mutation requires a trip revision scope');
    }
    const replay = await ensureIdempotentMutation(
      access.tripId,
      input.clientMutationId,
      async (mutation) => {
        if (!mutation.entityId) return null;

        const note = await this.repository.findNoteById(mutation.entityId);
        return note ? { note, revision: mutation.revision } : null;
      }
    );

    if (replay) {
      return replay;
    }

    await this.trips.ensureExpectedRevision(access.tripId, input.expectedRevision, {
      entityVersion: access.version,
      latestEntity: {
        id: noteId,
        tripId: access.tripId,
        version: access.version
      }
    });

    if (input.expectedVersion !== undefined && input.expectedVersion !== access.version) {
      throw new ConflictError('Note version conflict');
    }

    const data: Prisma.NoteUpdateInput = {
      version: { increment: 1 }
    };

    if (input.clientMutationId !== undefined) data.lastClientMutationId = input.clientMutationId;
    if (input.body !== undefined) data.body = input.body;
    if (input.mentions !== undefined) data.mentions = input.mentions;
    if (input.attachments !== undefined) data.attachments = input.attachments;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    return this.repository.updateNote(noteId, data, {
      tripId: access.tripId,
      actorId: actor.id,
      deviceId: input.deviceId,
      clientMutationId: input.clientMutationId,
      operation: 'ENTITY_UPDATED'
    });
  }

  async deleteNote(actor: AuthenticatedUser, noteId: string, query: DeleteNoteQuery) {
    const access = await this.repository.findNoteAccess(noteId);
    if (!access || access.deletedAt) {
      throw new NotFoundError({ resourceKey: 'resources.note' });
    }

    await this.collaboration.ensureCanManageNote(actor, access);

    if (!access.tripId) {
      throw new ConflictError('Note mutation requires a trip revision scope');
    }
    const replay = await ensureIdempotentMutation(
      access.tripId,
      query.clientMutationId,
      async (mutation) => {
        if (!mutation.entityId) return null;

        const note = await this.repository.findNoteById(mutation.entityId);
        return note ? { note, revision: mutation.revision } : null;
      }
    );

    if (replay) {
      return replay;
    }

    await this.trips.ensureExpectedRevision(access.tripId, query.expectedRevision, {
      entityVersion: access.version,
      latestEntity: {
        id: noteId,
        tripId: access.tripId,
        version: access.version
      }
    });

    return this.repository.softDeleteNote(noteId, {
      tripId: access.tripId,
      actorId: actor.id,
      deviceId: query.deviceId,
      clientMutationId: query.clientMutationId,
      operation: 'ENTITY_DELETED'
    });
  }

  private async ensureParentMatchesTarget(
    parentNoteId: string,
    target: {
      tripId: string;
      targetEntityType: CreateNoteInput['targetEntityType'];
      targetEntityId: string;
    }
  ) {
    const parent = await this.repository.findNoteAccess(parentNoteId);
    if (!parent || parent.deletedAt) {
      throw new NotFoundError({ resourceKey: 'resources.note' });
    }

    if (
      parent.tripId !== target.tripId ||
      parent.targetEntityType !== target.targetEntityType ||
      parent.targetEntityId !== target.targetEntityId
    ) {
      throw new ConflictError('Reply target must match parent note target');
    }
  }
}

export const notesService = new NotesService();
