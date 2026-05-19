import type { Request, Response } from 'express';

import { AuthError } from '@/common/errors/auth-error.js';
import { sendCreated, sendNoContent, sendSuccess } from '@/common/utils/response.js';
import {
  itineraryService,
  type ItineraryService
} from '@/modules/itinerary/itinerary.service.js';
import type {
  ActivityIdParams,
  CreateActivityInput,
  CreateActivityParams,
  CreateDayInput,
  CreateDayParams,
  ListDaysParams,
  UpdateActivityInput
} from '@/modules/itinerary/itinerary.schemas.js';

const requireUserId = (req: Request): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class ItineraryController {
  constructor(private readonly service: ItineraryService = itineraryService) {}

  listDays = async (req: Request<ListDaysParams>, res: Response) => {
    const days = await this.service.listDays(requireUserId(req), req.params.tripId);
    return sendSuccess(res, { days });
  };

  createDay = async (req: Request<CreateDayParams, unknown, CreateDayInput>, res: Response) => {
    const day = await this.service.createDay(requireUserId(req), req.params.tripId, req.body);
    return sendCreated(res, { day });
  };

  createActivity = async (
    req: Request<CreateActivityParams, unknown, CreateActivityInput>,
    res: Response
  ) => {
    const activity = await this.service.createActivity(requireUserId(req), req.params.dayId, req.body);
    return sendCreated(res, { activity });
  };

  updateActivity = async (
    req: Request<ActivityIdParams, unknown, UpdateActivityInput>,
    res: Response
  ) => {
    const activity = await this.service.updateActivity(requireUserId(req), req.params.activityId, req.body);
    return sendSuccess(res, { activity });
  };

  deleteActivity = async (req: Request<ActivityIdParams>, res: Response) => {
    await this.service.deleteActivity(requireUserId(req), req.params.activityId);
    return sendNoContent(res);
  };
}

export const itineraryController = new ItineraryController();
