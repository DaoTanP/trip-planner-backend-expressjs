import type { Note, Prisma } from '@prisma/client';

import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  type CursorPage
} from '@/common/utils/cursor-pagination.js';
import { registerCollaborationEntity } from '@/modules/collaboration/collaboration-entity-registry.js';
import { appendMutationEvent } from '@/modules/sync/mutation-event-log.js';
import { prisma } from '@/prisma/client.js';

type CreatedAtCursor = {
  createdAt: string;
  id: string;
};

type NoteMutationInput = {
  tripId: string;
  actorId: string;
  deviceId?: string | undefined;
  clientMutationId?: string | undefined;
  operation: string;
};

export type NoteAccessRecord = Pick<
  Note,
  | 'id'
  | 'tripId'
  | 'authorId'
  | 'parentNoteId'
  | 'targetEntityType'
  | 'targetEntityId'
  | 'version'
  | 'deletedAt'
>;

const noteInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true
    }
  }
} satisfies Prisma.NoteInclude;

export type NoteRecord = Prisma.NoteGetPayload<{ include: typeof noteInclude }>;

type NoteMutationResult = {
  note: NoteRecord;
  revision: bigint;
};

const createdAtOrderBy = [
  { createdAt: 'asc' },
  { id: 'asc' }
] satisfies Prisma.NoteOrderByWithRelationInput[];

const createdAtCursorWhere = (cursor: CreatedAtCursor | null): Prisma.NoteWhereInput =>
  cursor
    ? {
        OR: [
          { createdAt: { gt: new Date(cursor.createdAt) } },
          {
            createdAt: new Date(cursor.createdAt),
            id: { gt: cursor.id }
          }
        ]
      }
    : {};

const noteCursor = (note: Note): string =>
  encodeCursor({
    createdAt: note.createdAt.toISOString(),
    id: note.id
  });

export class NotesRepository {
  async list(filters: {
    cursor?: string | undefined;
    limit: number;
    tripId?: string | undefined;
    targetEntityType?: Note['targetEntityType'] | undefined;
    targetEntityId?: string | undefined;
    parentNoteId?: string | undefined;
  }): Promise<CursorPage<NoteRecord>> {
    const cursor = decodeCursor<CreatedAtCursor>(filters.cursor);
    const where: Prisma.NoteWhereInput = {
      parentNoteId: filters.parentNoteId ?? null,
      ...createdAtCursorWhere(cursor)
    };

    if (filters.tripId !== undefined) {
      where.tripId = filters.tripId;
    }
    if (filters.targetEntityType !== undefined) {
      where.targetEntityType = filters.targetEntityType;
    }
    if (filters.targetEntityId !== undefined) {
      where.targetEntityId = filters.targetEntityId;
    }

    const items = await prisma.note.findMany({
      where,
      include: noteInclude,
      orderBy: createdAtOrderBy,
      take: filters.limit + 1
    });

    return buildCursorPage(items, filters.limit, noteCursor);
  }

  createNote(
    data: Prisma.NoteUncheckedCreateInput,
    mutation: NoteMutationInput
  ): Promise<NoteMutationResult> {
    return prisma.$transaction(async (tx) => {
      const note = await tx.note.create({
        data,
        include: noteInclude
      });
      await registerCollaborationEntity(tx, {
        entityType: 'NOTE',
        entityId: note.id,
        tripId: note.tripId
      });
      const revision = await appendMutationEvent(tx, {
        ...mutation,
        entityType: 'NOTE',
        entityId: note.id,
        payload: {
          noteId: note.id,
          targetEntityType: note.targetEntityType,
          targetEntityId: note.targetEntityId,
          parentNoteId: note.parentNoteId
        }
      });

      return { note, revision };
    });
  }

  findNoteAccess(noteId: string): Promise<NoteAccessRecord | null> {
    return prisma.note.findFirst({
      where: { id: noteId },
      select: {
        id: true,
        tripId: true,
        authorId: true,
        parentNoteId: true,
        targetEntityType: true,
        targetEntityId: true,
        version: true,
        deletedAt: true
      }
    });
  }

  updateNote(
    noteId: string,
    data: Prisma.NoteUpdateInput,
    mutation: NoteMutationInput
  ): Promise<NoteMutationResult> {
    return prisma.$transaction(async (tx) => {
      const note = await tx.note.update({
        where: { id: noteId },
        data,
        include: noteInclude
      });
      const revision = await appendMutationEvent(tx, {
        ...mutation,
        entityType: 'NOTE',
        entityId: note.id,
        payload: { noteId: note.id, version: note.version }
      });

      return { note, revision };
    });
  }

  softDeleteNote(noteId: string, mutation: NoteMutationInput): Promise<NoteMutationResult> {
    return prisma.$transaction(async (tx) => {
      const note = await tx.note.update({
        where: { id: noteId },
        data: {
          deletedAt: new Date(),
          version: { increment: 1 },
          ...(mutation.clientMutationId ? { lastClientMutationId: mutation.clientMutationId } : {})
        },
        include: noteInclude
      });
      const revision = await appendMutationEvent(tx, {
        ...mutation,
        entityType: 'NOTE',
        entityId: note.id,
        payload: { noteId: note.id, version: note.version }
      });

      return { note, revision };
    });
  }
}

export const notesRepository = new NotesRepository();
