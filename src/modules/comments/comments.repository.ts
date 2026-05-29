import type { Comment, Prisma } from '@prisma/client';

import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  type CursorPage
} from '@/common/utils/cursor-pagination.js';
import { prisma } from '@/prisma/client.js';

type CreatedAtCursor = {
  createdAt: string;
  id: string;
};

const createdAtOrderBy = [
  { createdAt: 'asc' },
  { id: 'asc' }
] satisfies Prisma.CommentOrderByWithRelationInput[];

const createdAtCursorWhere = (cursor: CreatedAtCursor | null): Prisma.CommentWhereInput =>
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

const commentCursor = (comment: Comment): string =>
  encodeCursor({
    createdAt: comment.createdAt.toISOString(),
    id: comment.id
  });

export class CommentsRepository {
  async listForTrip(
    tripId: string,
    filters: {
      cursor?: string | undefined;
      limit: number;
      targetEntityType?: string | undefined;
      targetEntityId?: string | undefined;
    }
  ): Promise<CursorPage<Comment>> {
    const cursor = decodeCursor<CreatedAtCursor>(filters.cursor);
    const where: Prisma.CommentWhereInput = {
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

    const items = await prisma.comment.findMany({
      where,
      orderBy: createdAtOrderBy,
      take: filters.limit + 1
    });

    return buildCursorPage(items, filters.limit, commentCursor);
  }
}

export const commentsRepository = new CommentsRepository();
