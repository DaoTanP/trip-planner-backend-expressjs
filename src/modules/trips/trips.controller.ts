import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import {
  serializeTripCollaborator,
  serializeTripDetail,
  serializeTripExpenses,
  serializeTripSummary
} from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import {
  sendCreated,
  sendCursorPaginated,
  sendNoContent,
  sendPaginated,
  sendSuccess
} from '@/common/utils/response.js';
import type {
  CreateTripInput,
  ListTripExpensesParams,
  ListTripExpensesQuery,
  ListTripsQuery,
  TripIdParams,
  UpdateTripInput
} from '@/modules/trips/trips.schemas.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class TripsController {
  constructor(private readonly service: TripsService = tripsService) {}

  list = async (
    req: Request<ParamsDictionary, unknown, unknown, ListTripsQuery>,
    res: Response
  ) => {
    const result = await this.service.listTrips(requireUserId(req), req.query);
    return sendPaginated(res, result.items.map(serializeTripSummary), result.pagination);
  };

  create = async (req: Request<ParamsDictionary, unknown, CreateTripInput>, res: Response) => {
    const trip = await this.service.createTrip(requireUserId(req), req.body);
    return sendCreated(res, { trip: serializeTripSummary(trip) });
  };

  get = async (req: Request<TripIdParams>, res: Response) => {
    const trip = await this.service.getTrip(requireUserId(req), req.params.tripId);
    return sendSuccess(res, { trip: serializeTripDetail(trip) });
  };

  update = async (req: Request<TripIdParams, unknown, UpdateTripInput>, res: Response) => {
    const trip = await this.service.updateTrip(requireUserId(req), req.params.tripId, req.body);
    return sendSuccess(res, { trip: serializeTripDetail(trip) });
  };

  delete = async (req: Request<TripIdParams>, res: Response) => {
    await this.service.deleteTrip(requireUserId(req), req.params.tripId);
    return sendNoContent(res);
  };

  listCollaborators = async (req: Request<TripIdParams>, res: Response) => {
    const collaborators = await this.service.listCollaborators(
      requireUserId(req),
      req.params.tripId
    );
    return sendSuccess(res, { collaborators: collaborators.map(serializeTripCollaborator) });
  };

  getExpenses = async (
    req: Request<ListTripExpensesParams, unknown, unknown, ListTripExpensesQuery>,
    res: Response
  ) => {
    const expenses = await this.service.getExpenses(
      requireUserId(req),
      req.params.tripId,
      req.query
    );
    return sendCursorPaginated(
      res,
      serializeTripExpenses({
        budget: expenses.budget,
        categories: expenses.categories,
        expenses: expenses.expenses.items
      }),
      expenses.expenses.pagination
    );
  };
}

export const tripsController = new TripsController();
