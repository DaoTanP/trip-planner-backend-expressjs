import type { Budget, Prisma } from '@prisma/client';

import type { BudgetSummaryDto } from '@/api/contracts/index.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { findIdempotentMutation } from '@/modules/sync/idempotency.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';
import { budgetRepository, type BudgetRepository } from '@/modules/budget/budget.repository.js';
import type { UpsertTripBudgetInput } from '@/modules/budget/budget.schemas.js';

type BudgetWithSpent = {
  budget: Budget | null;
  spentAmount: number;
};

const decimalToNumber = (
  value: { toNumber: () => number } | number | string | null
): number | null => {
  if (value === null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber();
};

export class BudgetService {
  constructor(
    private readonly repository: BudgetRepository = budgetRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async getBudgetSummary(userId: string, tripId: string): Promise<BudgetSummaryDto> {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    const [budget, spentAmount] = await Promise.all([
      this.repository.findByTripId(tripId),
      this.repository.getSpentAmount(tripId)
    ]);

    return this.toSummary({ budget, spentAmount });
  }

  async upsertBudget(userId: string, tripId: string, input: UpsertTripBudgetInput) {
    await this.trips.ensureCanEditTrip(userId, tripId);

    const replay = await findIdempotentMutation(tripId, input.clientMutationId);
    if (replay) {
      const budget = await this.repository.findByTripId(tripId);
      if (!budget) {
        throw new NotFoundError({ resourceKey: 'resources.budget' });
      }

      return {
        summary: this.toSummary({
          budget,
          spentAmount: await this.repository.getSpentAmount(tripId)
        }),
        revision: replay.revision ?? 0n
      };
    }

    await this.trips.ensureExpectedRevision(tripId, input.expectedRevision, undefined, {
      actorId: userId,
      entityType: 'BUDGET',
      entityId: tripId,
      operation: 'ENTITY_UPDATED',
      localPayload: input as Record<string, unknown>
    });

    const data: Omit<Prisma.BudgetUncheckedCreateInput, 'tripId'> = {};
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.totalLimit !== undefined) data.totalLimit = input.totalLimit;
    if (input.metadata !== undefined) data.metadata = input.metadata;

    const result = await this.repository.upsertBudget(tripId, data, {
      tripId,
      actorId: userId,
      deviceId: input.deviceId,
      clientMutationId: input.clientMutationId
    });

    return {
      summary: this.toSummary({
        budget: result.budget,
        spentAmount: result.spentAmount
      }),
      revision: result.revision
    };
  }

  toSummary(input: BudgetWithSpent): BudgetSummaryDto {
    const budgetLimit = decimalToNumber(input.budget?.totalLimit ?? null);
    const remainingAmount = budgetLimit === null ? null : budgetLimit - input.spentAmount;
    const usagePercentage =
      budgetLimit === null || budgetLimit === 0
        ? null
        : Number(((input.spentAmount / budgetLimit) * 100).toFixed(2));

    return {
      budget: input.budget
        ? {
            id: input.budget.id,
            tripId: input.budget.tripId,
            currency: input.budget.currency,
            totalLimit: budgetLimit,
            metadata: input.budget.metadata as Record<string, unknown> | null,
            version: input.budget.version,
            createdAt: input.budget.createdAt.toISOString(),
            updatedAt: input.budget.updatedAt.toISOString()
          }
        : null,
      currency: input.budget?.currency ?? 'USD',
      budgetLimit,
      spentAmount: input.spentAmount,
      remainingAmount,
      usagePercentage
    };
  }
}

export const budgetService = new BudgetService();
