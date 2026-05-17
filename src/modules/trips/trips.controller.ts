import type { Request, Response } from 'express';

import { AuthError } from '@/common/errors/auth-error.js';
import { sendCreated, sendNoContent, sendSuccess } from '@/common/utils/response.js';
import type {
  CreateTripInput,
  ListTripsQuery,
  TripIdParams,
  UpdateTripInput
} from '@/modules/trips/trips.schemas.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

const requireUserId = (req: Request): string => {
  if (!req.user) {
    throw new AuthError('Missing authenticated user');
  }

  return req.user.id;
};

export class TripsController {
  constructor(private readonly service: TripsService = tripsService) {}

  list = async (req: Request<unknown, unknown, unknown, ListTripsQuery>, res: Response) => {
    const result = await this.service.listTrips(requireUserId(req), req.query);
    return sendSuccess(res, result.items, { pagination: result.pagination });
  };

  create = async (req: Request<unknown, unknown, CreateTripInput>, res: Response) => {
    const trip = await this.service.createTrip(requireUserId(req), req.body);
    return sendCreated(res, { trip });
  };

  get = async (req: Request<TripIdParams>, res: Response) => {
    const trip = await this.service.getTrip(requireUserId(req), req.params.tripId);
    return sendSuccess(res, { trip });
  };

  update = async (req: Request<TripIdParams, unknown, UpdateTripInput>, res: Response) => {
    const trip = await this.service.updateTrip(requireUserId(req), req.params.tripId, req.body);
    return sendSuccess(res, { trip });
  };

  delete = async (req: Request<TripIdParams>, res: Response) => {
    await this.service.deleteTrip(requireUserId(req), req.params.tripId);
    return sendNoContent(res);
  };
}

export const tripsController = new TripsController();
