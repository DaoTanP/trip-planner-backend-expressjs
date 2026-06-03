import type { Budget, Expense, ExpenseCategory, Prisma } from '@prisma/client';

import {
  buildCursorPage,
  decodeCursor,
  encodeCursor,
  type CursorPage
} from '@/common/utils/cursor-pagination.js';
import {
  appendMutationEvent,
  createEntityPatchPayload,
  syncOperations
} from '@/modules/sync/mutation-event-log.js';
import { prisma } from '@/prisma/client.js';

type CreatedAtCursor = {
  createdAt: string;
  id: string;
};

export type ExpenseListFilters = {
  cursor?: string | undefined;
  limit: number;
  categoryId?: string | undefined;
  itineraryItemId?: string | undefined;
  paidByUserId?: string | undefined;
};

export type ExpenseMutationInput = {
  tripId: string;
  actorId: string;
  deviceId?: string | undefined;
  clientMutationId?: string | undefined;
};

export type ExpenseMutationResult = {
  expense: Expense;
  revision: bigint;
};

export type TripExpensesResult = {
  budget: Budget | null;
  categories: ExpenseCategory[];
  expenses: CursorPage<Expense>;
  spentAmount: number;
};

const expenseOrderBy = [
  { createdAt: 'asc' },
  { id: 'asc' }
] satisfies Prisma.ExpenseOrderByWithRelationInput[];

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

const expenseCursor = (expense: Expense): string =>
  encodeCursor({
    createdAt: expense.createdAt.toISOString(),
    id: expense.id
  });

const expensePatchFields = (expense: Expense): Prisma.InputJsonObject => ({
  id: expense.id,
  tripId: expense.tripId,
  categoryId: expense.categoryId,
  itineraryItemId: expense.itineraryItemId,
  title: expense.title,
  amount: Number(expense.amount),
  currency: expense.currency,
  paidByUserId: expense.paidByUserId,
  spentAt: expense.spentAt?.toISOString() ?? null,
  notes: expense.notes,
  attachments: expense.attachments as Prisma.InputJsonValue | null,
  metadata: expense.metadata as Prisma.InputJsonValue | null,
  version: expense.version,
  createdAt: expense.createdAt.toISOString(),
  updatedAt: expense.updatedAt.toISOString(),
  deletedAt: expense.deletedAt?.toISOString() ?? null
});

export class ExpensesRepository {
  async listForTrip(tripId: string, filters: ExpenseListFilters): Promise<TripExpensesResult> {
    const cursor = decodeCursor<CreatedAtCursor>(filters.cursor);
    const where: Prisma.ExpenseWhereInput = {
      tripId,
      deletedAt: null,
      ...createdAtCursorWhere(cursor)
    };

    if (filters.categoryId !== undefined) where.categoryId = filters.categoryId;
    if (filters.itineraryItemId !== undefined) where.itineraryItemId = filters.itineraryItemId;
    if (filters.paidByUserId !== undefined) where.paidByUserId = filters.paidByUserId;

    return prisma.$transaction(async (tx) => {
      const [budget, categories, expenses, aggregate] = await Promise.all([
        tx.budget.findUnique({ where: { tripId } }),
        tx.expenseCategory.findMany({
          where: { tripId, deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
        }),
        tx.expense.findMany({
          where,
          orderBy: expenseOrderBy,
          take: filters.limit + 1
        }),
        tx.expense.aggregate({
          where: {
            tripId,
            deletedAt: null
          },
          _sum: {
            amount: true
          }
        })
      ]);

      return {
        budget,
        categories,
        expenses: buildCursorPage(expenses, filters.limit, expenseCursor),
        spentAmount: aggregate._sum.amount === null ? 0 : Number(aggregate._sum.amount)
      };
    });
  }

  createExpense(
    data: Prisma.ExpenseUncheckedCreateInput,
    mutation: ExpenseMutationInput
  ): Promise<ExpenseMutationResult> {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({ data });
      const revision = await appendMutationEvent(tx, {
        ...mutation,
        entityType: 'EXPENSE',
        entityId: expense.id,
        operation: syncOperations.created,
        payload: createEntityPatchPayload({
          patchType: syncOperations.created,
          entityType: 'EXPENSE',
          entityId: expense.id,
          fields: expensePatchFields(expense)
        })
      });

      return { expense, revision };
    });
  }

  findExpenseAccess(expenseId: string): Promise<{ tripId: string; version: number } | null> {
    return prisma.expense.findFirst({
      where: { id: expenseId, deletedAt: null },
      select: {
        tripId: true,
        version: true
      }
    });
  }

  findExpenseById(expenseId: string): Promise<Expense | null> {
    return prisma.expense.findUnique({
      where: { id: expenseId }
    });
  }

  updateExpense(
    expenseId: string,
    data: Prisma.ExpenseUpdateInput,
    mutation: ExpenseMutationInput
  ): Promise<ExpenseMutationResult> {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({
        where: { id: expenseId },
        data
      });
      const revision = await appendMutationEvent(tx, {
        ...mutation,
        entityType: 'EXPENSE',
        entityId: expense.id,
        operation: syncOperations.updated,
        payload: createEntityPatchPayload({
          patchType: syncOperations.updated,
          entityType: 'EXPENSE',
          entityId: expense.id,
          fields: expensePatchFields(expense)
        })
      });

      return { expense, revision };
    });
  }

  softDeleteExpense(
    expenseId: string,
    mutation: ExpenseMutationInput
  ): Promise<ExpenseMutationResult> {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          deletedAt: new Date(),
          version: { increment: 1 },
          ...(mutation.clientMutationId ? { lastClientMutationId: mutation.clientMutationId } : {})
        }
      });
      const revision = await appendMutationEvent(tx, {
        ...mutation,
        entityType: 'EXPENSE',
        entityId: expense.id,
        operation: syncOperations.deleted,
        payload: createEntityPatchPayload({
          patchType: syncOperations.deleted,
          entityType: 'EXPENSE',
          entityId: expense.id,
          tombstone: {
            id: expense.id,
            tripId: expense.tripId,
            version: expense.version,
            deletedAt: expense.deletedAt?.toISOString() ?? null
          }
        })
      });

      return { expense, revision };
    });
  }

  categoryBelongsToTrip(categoryId: string, tripId: string): Promise<boolean> {
    return prisma.expenseCategory
      .findFirst({
        where: { id: categoryId, tripId, deletedAt: null },
        select: { id: true }
      })
      .then(Boolean);
  }

  itineraryItemBelongsToTrip(itemId: string, tripId: string): Promise<boolean> {
    return prisma.itineraryItem
      .findFirst({
        where: { id: itemId, tripId, deletedAt: null },
        select: { id: true }
      })
      .then(Boolean);
  }

  userBelongsToTrip(userId: string, tripId: string): Promise<boolean> {
    return prisma.trip
      .findFirst({
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
        select: { id: true }
      })
      .then(Boolean);
  }
}

export const expensesRepository = new ExpensesRepository();
