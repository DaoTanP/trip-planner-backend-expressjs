import type { Prisma, RouteSegment } from '@prisma/client';

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
] satisfies Prisma.RouteSegmentOrderByWithRelationInput[];

const createdAtCursorWhere = (cursor: CreatedAtCursor | null): Prisma.RouteSegmentWhereInput =>
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

const routeCursor = (route: RouteSegment): string =>
  encodeCursor({
    createdAt: route.createdAt.toISOString(),
    id: route.id
  });

export class RoutesRepository {
  async listForTrip(
    tripId: string,
    filters: { cursor?: string | undefined; limit: number }
  ): Promise<CursorPage<RouteSegment>> {
    const cursor = decodeCursor<CreatedAtCursor>(filters.cursor);
    const routes = await prisma.routeSegment.findMany({
      where: {
        deletedAt: null,
        ...createdAtCursorWhere(cursor),
        OR: [
          { tripId },
          {
            itineraryItems: {
              some: {
                tripId,
                deletedAt: null
              }
            }
          }
        ]
      },
      orderBy: createdAtOrderBy,
      take: filters.limit + 1
    });

    return buildCursorPage(routes, filters.limit, routeCursor);
  }
}

export const routesRepository = new RoutesRepository();
