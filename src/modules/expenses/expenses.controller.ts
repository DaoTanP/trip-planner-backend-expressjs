import type { Request, Response } from 'express';

import { serializeExpense, serializeTripExpenses } from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import {
  sendCreated,
  sendCursorPaginated,
  sendNoContent,
  sendSuccess
} from '@/common/utils/response.js';
import { expensesService, type ExpensesService } from '@/modules/expenses/expenses.service.js';
import type {
  CreateExpenseInput,
  DeleteExpenseQuery,
  ExpenseIdParams,
  ListTripExpensesParams,
  ListTripExpensesQuery,
  UpdateExpenseInput
} from '@/modules/expenses/expenses.schemas.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class ExpensesController {
  constructor(private readonly service: ExpensesService = expensesService) {}

  list = async (
    req: Request<ListTripExpensesParams, unknown, unknown, ListTripExpensesQuery>,
    res: Response
  ) => {
    const result = await this.service.listExpenses(
      requireUserId(req),
      req.params.tripId,
      req.query
    );

    return sendCursorPaginated(
      res,
      serializeTripExpenses({
        budget: result.budget,
        categories: result.categories,
        expenses: result.expenses.items,
        summary: result.summary
      }),
      result.expenses.pagination
    );
  };

  create = async (
    req: Request<ListTripExpensesParams, unknown, CreateExpenseInput>,
    res: Response
  ) => {
    const result = await this.service.createExpense(
      requireUserId(req),
      req.params.tripId,
      req.body
    );
    return sendCreated(res, {
      expense: serializeExpense(result.expense),
      revision: result.revision.toString(),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };

  update = async (req: Request<ExpenseIdParams, unknown, UpdateExpenseInput>, res: Response) => {
    const result = await this.service.updateExpense(
      requireUserId(req),
      req.params.expenseId,
      req.body
    );
    return sendSuccess(res, {
      expense: serializeExpense(result.expense),
      revision: result.revision.toString(),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };

  delete = async (
    req: Request<ExpenseIdParams, unknown, unknown, DeleteExpenseQuery>,
    res: Response
  ) => {
    await this.service.deleteExpense(requireUserId(req), req.params.expenseId, req.query);
    return sendNoContent(res);
  };
}

export const expensesController = new ExpensesController();
