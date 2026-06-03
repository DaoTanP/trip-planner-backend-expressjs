import { Router } from 'express';

import { authenticate } from '@/common/middleware/auth.middleware.js';
import { validateRequest } from '@/common/middleware/validate-request.middleware.js';
import { asyncHandler } from '@/common/utils/async-handler.js';
import { expensesController } from '@/modules/expenses/expenses.controller.js';
import {
  createExpenseSchema,
  deleteExpenseSchema,
  listTripExpensesSchema,
  updateExpenseSchema
} from '@/modules/expenses/expenses.schemas.js';

export const expensesRouter = Router();

expensesRouter.use(authenticate);
expensesRouter.get(
  '/trips/:tripId/expenses',
  validateRequest(listTripExpensesSchema),
  asyncHandler(expensesController.list)
);
expensesRouter.post(
  '/trips/:tripId/expenses',
  validateRequest(createExpenseSchema),
  asyncHandler(expensesController.create)
);
expensesRouter.patch(
  '/expenses/:expenseId',
  validateRequest(updateExpenseSchema),
  asyncHandler(expensesController.update)
);
expensesRouter.delete(
  '/expenses/:expenseId',
  validateRequest(deleteExpenseSchema),
  asyncHandler(expensesController.delete)
);
