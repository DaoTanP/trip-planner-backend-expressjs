import type { Request, Response } from 'express';

import { AuthError } from '@/common/errors/auth-error.js';
import { sendSuccess } from '@/common/utils/response.js';
import { budgetService, type BudgetService } from '@/modules/budget/budget.service.js';
import type { TripBudgetParams, UpsertTripBudgetInput } from '@/modules/budget/budget.schemas.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class BudgetController {
  constructor(private readonly service: BudgetService = budgetService) {}

  get = async (req: Request<TripBudgetParams>, res: Response) => {
    const summary = await this.service.getBudgetSummary(requireUserId(req), req.params.tripId);
    return sendSuccess(res, summary);
  };

  upsert = async (
    req: Request<TripBudgetParams, unknown, UpsertTripBudgetInput>,
    res: Response
  ) => {
    const result = await this.service.upsertBudget(requireUserId(req), req.params.tripId, req.body);
    return sendSuccess(res, {
      ...result.summary,
      revision: result.revision.toString(),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };
}

export const budgetController = new BudgetController();
