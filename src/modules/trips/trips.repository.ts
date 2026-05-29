import type { Budget, Expense, ExpenseCategory, Prisma, Trip } from '@prisma/client';

import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  type CursorPage
} from '@/common/utils/cursor-pagination.js';
import { registerCollaborationEntity } from '@/modules/collaboration/collaboration-entity-registry.js';
import { appendMutationEvent } from '@/modules/sync/mutation-event-log.js';
import { prisma } from '@/prisma/client.js';

export type TripListFilters = {
  status?: Trip['status'];
  page: number;
  limit: number;
};

type CreatedAtCursor = {
  createdAt: string;
  id: string;
};

const createdAtCursorWhere = (cursor: CreatedAtCursor | null): Prisma.ExpenseWhereInput =>
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

const expenseOrderBy = [
  { createdAt: 'asc' },
  { id: 'asc' }
] satisfies Prisma.ExpenseOrderByWithRelationInput[];

const expenseCursor = (expense: Expense): string =>
  encodeCursor({
    createdAt: expense.createdAt.toISOString(),
    id: expense.id
  });

export class TripsRepository {
  async findForUser(userId: string, filters: TripListFilters) {
    const where: Prisma.TripWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      OR: [
        { ownerId: userId },
        {
          collaborators: {
            some: {
              userId,
              acceptedAt: { not: null },
              deletedAt: null
            }
          }
        }
      ]
    };

    const [items, total] = await prisma.$transaction([
      prisma.trip.findMany({
        where,
        orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          _count: {
            select: {
              collaborators: {
                where: {
                  deletedAt: null
                }
              },
              itineraryItems: {
                where: {
                  deletedAt: null
                }
              },
              notes: {
                where: {
                  deletedAt: null
                }
              },
              routeSegments: {
                where: {
                  deletedAt: null
                }
              }
            }
          }
        }
      }),
      prisma.trip.count({ where })
    ]);

    return { items, total };
  }

  create(data: Prisma.TripUncheckedCreateInput, actorId: string): Promise<Trip> {
    return prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data
      });
      await registerCollaborationEntity(tx, {
        entityType: 'TRIP',
        entityId: trip.id,
        tripId: trip.id
      });
      await appendMutationEvent(tx, {
        tripId: trip.id,
        actorId,
        entityType: 'TRIP',
        entityId: trip.id,
        operation: 'CREATE',
        payload: { tripId: trip.id }
      });

      return tx.trip.findUniqueOrThrow({
        where: { id: trip.id }
      });
    });
  }

  findById(id: string) {
    return prisma.trip.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        collaborators: {
          where: {
            deletedAt: null
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            collaborators: {
              where: {
                deletedAt: null
              }
            },
            itineraryItems: {
              where: {
                deletedAt: null
              }
            },
            notes: {
              where: {
                deletedAt: null
              }
            },
            routeSegments: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    });
  }

  findAccess(tripId: string, userId: string) {
    return prisma.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { ownerId: userId },
          {
            collaborators: {
              some: {
                userId,
                acceptedAt: { not: null },
                deletedAt: null
              }
            }
          }
        ]
      },
      select: {
        id: true,
        ownerId: true,
        collaborators: {
          where: {
            userId,
            acceptedAt: { not: null },
            deletedAt: null
          },
          select: {
            role: true
          }
        }
      }
    });
  }

  findIdentity(tripId: string) {
    return prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        ownerId: true
      }
    });
  }

  update(
    id: string,
    data: Prisma.TripUpdateInput,
    mutation: {
      actorId: string;
      clientMutationId?: string | undefined;
      deviceId?: string | undefined;
    }
  ): Promise<Trip> {
    return prisma.$transaction(async (tx) => {
      const trip = await tx.trip.update({
        where: { id },
        data
      });
      await appendMutationEvent(tx, {
        tripId: id,
        actorId: mutation.actorId,
        deviceId: mutation.deviceId,
        clientMutationId: mutation.clientMutationId,
        entityType: 'TRIP',
        entityId: id,
        operation: 'UPDATE',
        payload: { tripId: id, version: trip.version }
      });

      return trip;
    });
  }

  listCollaborators(tripId: string) {
    return prisma.tripCollaborator.findMany({
      where: { tripId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
    });
  }

  getExpenses(
    tripId: string,
    filters: { cursor?: string | undefined; limit: number }
  ): Promise<{
    budget: Budget | null;
    categories: ExpenseCategory[];
    expenses: CursorPage<Expense>;
  }> {
    return prisma.$transaction(async (tx) => {
      const cursor = decodeCursor<CreatedAtCursor>(filters.cursor);
      const [budget, categories, expenses] = await Promise.all([
        tx.budget.findUnique({
          where: { tripId }
        }),
        tx.expenseCategory.findMany({
          where: { tripId, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
        }),
        tx.expense.findMany({
          where: {
            tripId,
            deletedAt: null,
            ...createdAtCursorWhere(cursor)
          },
          orderBy: expenseOrderBy,
          take: filters.limit + 1
        })
      ]);

      return {
        budget,
        categories,
        expenses: buildCursorPage(expenses, filters.limit, expenseCursor)
      };
    });
  }

  delete(id: string): Promise<Trip> {
    return prisma.trip.delete({
      where: { id }
    });
  }
}

export const tripsRepository = new TripsRepository();
