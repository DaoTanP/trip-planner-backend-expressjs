import type { Note, Prisma } from '@prisma/client';

import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  type CursorPage
} from '@/common/utils/cursor-pagination.js';
import { prisma } from '@/prisma/client.js';
import type { NoteTargetEntityType } from '@/modules/notes/notes.schemas.js';

type CreatedAtCursor = {
  createdAt: string;
  id: string;
};

type NoteMutationInput = {
  actorId: string;
  clientMutationId?: string | undefined;
  operation: string;
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
  async listForTrip(
    tripId: string,
    filters: {
      cursor?: string;
      limit: number;
      targetEntityType?: string | undefined;
      targetEntityId?: string | undefined;
    }
  ): Promise<CursorPage<Note>> {
    const cursor = decodeCursor<CreatedAtCursor>(filters.cursor);
    const where: Prisma.NoteWhereInput = {
      tripId,
      deletedAt: null,
      ...createdAtCursorWhere(cursor)
    };

    if (filters.targetEntityType !== undefined) {
      where.targetEntityType = filters.targetEntityType;
    }
    if (filters.targetEntityId !== undefined) {
      where.targetEntityId = filters.targetEntityId;
    }

    const items = await prisma.note.findMany({
      where,
      orderBy: createdAtOrderBy,
      take: filters.limit + 1
    });

    return buildCursorPage(items, filters.limit, noteCursor);
  }

  createNote(data: Prisma.NoteUncheckedCreateInput, mutation: NoteMutationInput): Promise<Note> {
    return prisma.$transaction(async (tx) => {
      const note = await tx.note.create({ data });
      await this.recordClientMutation(tx, {
        ...mutation,
        tripId: note.tripId,
        entityType: 'NOTE',
        entityId: note.id
      });

      return note;
    });
  }

  findNoteAccess(noteId: string): Promise<{ tripId: string; version: number } | null> {
    return prisma.note.findFirst({
      where: { id: noteId, deletedAt: null },
      select: { tripId: true, version: true }
    });
  }

  updateNote(
    noteId: string,
    data: Prisma.NoteUpdateInput,
    mutation: NoteMutationInput & { tripId: string }
  ): Promise<Note> {
    return prisma.$transaction(async (tx) => {
      const note = await tx.note.update({
        where: { id: noteId },
        data
      });
      await this.recordClientMutation(tx, {
        ...mutation,
        entityType: 'NOTE',
        entityId: note.id
      });

      return note;
    });
  }

  softDeleteNote(noteId: string, mutation: NoteMutationInput & { tripId: string }): Promise<Note> {
    return prisma.$transaction(async (tx) => {
      const note = await tx.note.update({
        where: { id: noteId },
        data: {
          deletedAt: new Date(),
          version: { increment: 1 },
          ...(mutation.clientMutationId ? { lastClientMutationId: mutation.clientMutationId } : {})
        }
      });
      await this.recordClientMutation(tx, {
        ...mutation,
        entityType: 'NOTE',
        entityId: note.id
      });

      return note;
    });
  }

  async findTargetTripId(
    targetEntityType: NoteTargetEntityType,
    targetEntityId: string
  ): Promise<string | null> {
    if (targetEntityType === 'TRIP') {
      const trip = await prisma.trip.findUnique({
        where: { id: targetEntityId },
        select: { id: true }
      });

      return trip?.id ?? null;
    }

    if (targetEntityType === 'ITINERARY_ITEM') {
      const item = await prisma.itineraryItem.findFirst({
        where: { id: targetEntityId, deletedAt: null },
        select: { tripId: true }
      });

      return item?.tripId ?? null;
    }

    if (targetEntityType === 'EXPENSE') {
      const expense = await prisma.expense.findFirst({
        where: { id: targetEntityId, deletedAt: null },
        select: { tripId: true }
      });

      return expense?.tripId ?? null;
    }

    const route = await prisma.routeSegment.findFirst({
      where: { id: targetEntityId, deletedAt: null },
      select: { tripId: true }
    });

    return route?.tripId ?? null;
  }

  private recordClientMutation(
    tx: Prisma.TransactionClient,
    input: NoteMutationInput & {
      tripId: string;
      entityType: string;
      entityId: string;
    }
  ) {
    if (!input.clientMutationId) {
      return Promise.resolve();
    }

    return tx.clientMutation.createMany({
      data: [
        {
          tripId: input.tripId,
          actorId: input.actorId,
          clientMutationId: input.clientMutationId,
          entityType: input.entityType,
          entityId: input.entityId,
          operation: input.operation
        }
      ],
      skipDuplicates: true
    });
  }
}

export const notesRepository = new NotesRepository();
