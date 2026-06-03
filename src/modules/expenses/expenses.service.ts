import type { Prisma } from '@prisma/client';

import { ConflictError } from '@/common/errors/conflict-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { normalizeCursorLimit } from '@/common/utils/cursor-pagination.js';
import { budgetService, type BudgetService } from '@/modules/budget/budget.service.js';
import {
  expensesRepository,
  type ExpensesRepository
} from '@/modules/expenses/expenses.repository.js';
import type {
  CreateExpenseInput,
  DeleteExpenseQuery,
  ListTripExpensesQuery,
  UpdateExpenseInput
} from '@/modules/expenses/expenses.schemas.js';
import { ensureIdempotentMutation } from '@/modules/sync/idempotency.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

export class ExpensesService {
  constructor(
    private readonly repository: ExpensesRepository = expensesRepository,
    private readonly trips: TripsService = tripsService,
    private readonly budgets: BudgetService = budgetService
  ) {}

  async listExpenses(userId: string, tripId: string, query: ListTripExpensesQuery) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    const result = await this.repository.listForTrip(tripId, {
      cursor: query.cursor,
      limit: normalizeCursorLimit(query.limit),
      categoryId: query.categoryId,
      itineraryItemId: query.itineraryItemId,
      paidByUserId: query.paidByUserId
    });

    return {
      ...result,
      summary: this.budgets.toSummary({
        budget: result.budget,
        spentAmount: result.spentAmount
      })
    };
  }

  async createExpense(userId: string, tripId: string, input: CreateExpenseInput) {
    await this.trips.ensureCanEditTrip(userId, tripId);
    const replay = await ensureIdempotentMutation(
      tripId,
      input.clientMutationId,
      async (mutation) => {
        if (!mutation.entityId) return null;

        const expense = await this.repository.findExpenseById(mutation.entityId);
        return expense ? { expense, revision: mutation.revision } : null;
      }
    );

    if (replay) {
      return replay;
    }

    await this.trips.ensureExpectedRevision(tripId, input.expectedRevision);
    await this.ensureLinksBelongToTrip(
      tripId,
      input.categoryId,
      input.itineraryItemId,
      input.paidByUserId
    );

    const data: Prisma.ExpenseUncheckedCreateInput = {
      tripId,
      title: input.title,
      amount: input.amount,
      currency: input.currency
    };

    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.itineraryItemId !== undefined) data.itineraryItemId = input.itineraryItemId;
    if (input.paidByUserId !== undefined) data.paidByUserId = input.paidByUserId;
    if (input.spentAt !== undefined) data.spentAt = input.spentAt ? new Date(input.spentAt) : null;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.attachments !== undefined) data.attachments = input.attachments;
    if (input.metadata !== undefined) data.metadata = input.metadata;
    if (input.clientMutationId !== undefined) data.lastClientMutationId = input.clientMutationId;

    return this.repository.createExpense(data, {
      tripId,
      actorId: userId,
      deviceId: input.deviceId,
      clientMutationId: input.clientMutationId
    });
  }

  async updateExpense(userId: string, expenseId: string, input: UpdateExpenseInput) {
    const access = await this.repository.findExpenseAccess(expenseId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.expense' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);
    const replay = await ensureIdempotentMutation(
      access.tripId,
      input.clientMutationId,
      async (mutation) => {
        if (!mutation.entityId) return null;

        const expense = await this.repository.findExpenseById(mutation.entityId);
        return expense ? { expense, revision: mutation.revision } : null;
      }
    );

    if (replay) {
      return replay;
    }

    await this.trips.ensureExpectedRevision(access.tripId, input.expectedRevision, {
      entityVersion: access.version,
      latestEntity: {
        id: expenseId,
        tripId: access.tripId,
        version: access.version
      }
    });

    if (input.expectedVersion !== undefined && input.expectedVersion !== access.version) {
      throw new ConflictError('Expense version conflict');
    }

    await this.ensureLinksBelongToTrip(
      access.tripId,
      input.categoryId,
      input.itineraryItemId,
      input.paidByUserId
    );

    const data: Prisma.ExpenseUpdateInput = {
      version: { increment: 1 }
    };

    if (input.categoryId !== undefined) {
      data.category = input.categoryId
        ? { connect: { id: input.categoryId } }
        : { disconnect: true };
    }
    if (input.itineraryItemId !== undefined) {
      data.itineraryItem = input.itineraryItemId
        ? { connect: { id: input.itineraryItemId } }
        : { disconnect: true };
    }
    if (input.title !== undefined) data.title = input.title;
    if (input.amount !== undefined) data.amount = input.amount;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.paidByUserId !== undefined) {
      data.paidByUser = input.paidByUserId
        ? { connect: { id: input.paidByUserId } }
        : { disconnect: true };
    }
    if (input.spentAt !== undefined) data.spentAt = input.spentAt ? new Date(input.spentAt) : null;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.attachments !== undefined) data.attachments = input.attachments;
    if (input.metadata !== undefined) data.metadata = input.metadata;
    if (input.clientMutationId !== undefined) data.lastClientMutationId = input.clientMutationId;

    return this.repository.updateExpense(expenseId, data, {
      tripId: access.tripId,
      actorId: userId,
      deviceId: input.deviceId,
      clientMutationId: input.clientMutationId
    });
  }

  async deleteExpense(userId: string, expenseId: string, query: DeleteExpenseQuery): Promise<void> {
    const access = await this.repository.findExpenseAccess(expenseId);
    if (!access) {
      throw new NotFoundError({ resourceKey: 'resources.expense' });
    }

    await this.trips.ensureCanEditTrip(userId, access.tripId);
    const replay = await ensureIdempotentMutation(
      access.tripId,
      query.clientMutationId,
      async () => true
    );
    if (replay) {
      return;
    }

    await this.trips.ensureExpectedRevision(access.tripId, query.expectedRevision, {
      entityVersion: access.version,
      latestEntity: {
        id: expenseId,
        tripId: access.tripId,
        version: access.version
      }
    });

    await this.repository.softDeleteExpense(expenseId, {
      tripId: access.tripId,
      actorId: userId,
      deviceId: query.deviceId,
      clientMutationId: query.clientMutationId
    });
  }

  private async ensureLinksBelongToTrip(
    tripId: string,
    categoryId?: string | null,
    itineraryItemId?: string | null,
    paidByUserId?: string | null
  ) {
    if (categoryId) {
      const validCategory = await this.repository.categoryBelongsToTrip(categoryId, tripId);
      if (!validCategory) {
        throw new ConflictError('Expense category belongs to a different trip');
      }
    }

    if (itineraryItemId) {
      const validItem = await this.repository.itineraryItemBelongsToTrip(itineraryItemId, tripId);
      if (!validItem) {
        throw new ConflictError('Expense itinerary item belongs to a different trip');
      }
    }

    if (paidByUserId) {
      const validUser = await this.repository.userBelongsToTrip(paidByUserId, tripId);
      if (!validUser) {
        throw new ConflictError('Expense payer is not a trip participant');
      }
    }
  }
}

export const expensesService = new ExpensesService();
