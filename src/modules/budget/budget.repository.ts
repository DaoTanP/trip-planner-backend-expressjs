import type { Budget, Prisma } from '@prisma/client';

import {
  appendMutationEvent,
  createEntityPatchPayload,
  syncOperations
} from '@/modules/sync/mutation-event-log.js';
import { prisma } from '@/prisma/client.js';

export type BudgetMutationInput = {
  tripId: string;
  actorId: string;
  deviceId?: string | undefined;
  clientMutationId?: string | undefined;
};

export type BudgetMutationResult = {
  budget: Budget;
  spentAmount: number;
  revision: bigint;
};

const budgetPatchFields = (budget: Budget): Prisma.InputJsonObject => ({
  id: budget.id,
  tripId: budget.tripId,
  currency: budget.currency,
  totalLimit: budget.totalLimit === null ? null : Number(budget.totalLimit),
  metadata: budget.metadata as Prisma.InputJsonValue | null,
  version: budget.version,
  createdAt: budget.createdAt.toISOString(),
  updatedAt: budget.updatedAt.toISOString()
});

export class BudgetRepository {
  findByTripId(tripId: string): Promise<Budget | null> {
    return prisma.budget.findUnique({
      where: { tripId }
    });
  }

  async getSpentAmount(tripId: string): Promise<number> {
    const aggregate = await prisma.expense.aggregate({
      where: {
        tripId,
        deletedAt: null
      },
      _sum: {
        amount: true
      }
    });

    return aggregate._sum.amount === null ? 0 : Number(aggregate._sum.amount);
  }

  upsertBudget(
    tripId: string,
    data: Omit<Prisma.BudgetUncheckedCreateInput, 'tripId'>,
    mutation: BudgetMutationInput
  ): Promise<BudgetMutationResult> {
    return prisma.$transaction(async (tx) => {
      const existingBudget = await tx.budget.findUnique({
        where: { tripId },
        select: { id: true }
      });
      const operation = existingBudget ? syncOperations.updated : syncOperations.created;
      const budget = await tx.budget.upsert({
        where: { tripId },
        create: {
          tripId,
          ...data
        },
        update: {
          ...data,
          version: { increment: 1 }
        }
      });

      const revision = await appendMutationEvent(tx, {
        tripId,
        actorId: mutation.actorId,
        deviceId: mutation.deviceId,
        clientMutationId: mutation.clientMutationId,
        entityType: 'BUDGET',
        entityId: budget.id,
        operation,
        payload: createEntityPatchPayload({
          patchType: operation,
          entityType: 'BUDGET',
          entityId: budget.id,
          fields: budgetPatchFields(budget)
        })
      });

      const aggregate = await tx.expense.aggregate({
        where: {
          tripId,
          deletedAt: null
        },
        _sum: {
          amount: true
        }
      });

      return {
        budget,
        spentAmount: aggregate._sum.amount === null ? 0 : Number(aggregate._sum.amount),
        revision
      };
    });
  }
}

export const budgetRepository = new BudgetRepository();
