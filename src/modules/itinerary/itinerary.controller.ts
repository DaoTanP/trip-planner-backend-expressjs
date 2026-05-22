import type { Request, Response } from 'express';

import { serializeItineraryItem, serializeTripDay } from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import { sendCreated, sendNoContent, sendSuccess } from '@/common/utils/response.js';
import { itineraryService, type ItineraryService } from '@/modules/itinerary/itinerary.service.js';
import type {
  CreateDayInput,
  CreateDayParams,
  CreateItineraryItemInput,
  CreateItineraryItemParams,
  DayIdParams,
  ItineraryItemIdParams,
  ListDaysParams,
  ReorderDaysInput,
  ReorderDaysParams,
  ReorderItineraryItemsInput,
  ReorderItineraryItemsParams,
  UpdateDayInput,
  UpdateItineraryItemInput
} from '@/modules/itinerary/itinerary.schemas.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class ItineraryController {
  constructor(private readonly service: ItineraryService = itineraryService) {}

  listDays = async (req: Request<ListDaysParams>, res: Response) => {
    const days = await this.service.listDays(requireUserId(req), req.params.tripId);
    return sendSuccess(res, { days: days.map(serializeTripDay) });
  };

  createDay = async (req: Request<CreateDayParams, unknown, CreateDayInput>, res: Response) => {
    const day = await this.service.createDay(requireUserId(req), req.params.tripId, req.body);
    return sendCreated(res, { day: serializeTripDay(day) });
  };

  updateDay = async (req: Request<DayIdParams, unknown, UpdateDayInput>, res: Response) => {
    const day = await this.service.updateDay(requireUserId(req), req.params.dayId, req.body);
    return sendSuccess(res, { day: serializeTripDay(day) });
  };

  deleteDay = async (req: Request<DayIdParams>, res: Response) => {
    await this.service.deleteDay(requireUserId(req), req.params.dayId);
    return sendNoContent(res);
  };

  reorderDays = async (
    req: Request<ReorderDaysParams, unknown, ReorderDaysInput>,
    res: Response
  ) => {
    const days = await this.service.reorderDays(requireUserId(req), req.params.tripId, req.body);
    return sendSuccess(res, {
      days: days.map(serializeTripDay),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };

  createItineraryItem = async (
    req: Request<CreateItineraryItemParams, unknown, CreateItineraryItemInput>,
    res: Response
  ) => {
    const item = await this.service.createItineraryItem(
      requireUserId(req),
      req.params.dayId,
      req.body
    );
    return sendCreated(res, { item: serializeItineraryItem(item) });
  };

  updateItineraryItem = async (
    req: Request<ItineraryItemIdParams, unknown, UpdateItineraryItemInput>,
    res: Response
  ) => {
    const item = await this.service.updateItineraryItem(
      requireUserId(req),
      req.params.itemId,
      req.body
    );
    return sendSuccess(res, { item: serializeItineraryItem(item) });
  };

  deleteItineraryItem = async (req: Request<ItineraryItemIdParams>, res: Response) => {
    await this.service.deleteItineraryItem(requireUserId(req), req.params.itemId);
    return sendNoContent(res);
  };

  reorderItineraryItems = async (
    req: Request<ReorderItineraryItemsParams, unknown, ReorderItineraryItemsInput>,
    res: Response
  ) => {
    const days = await this.service.reorderItineraryItems(
      requireUserId(req),
      req.params.tripId,
      req.body
    );
    return sendSuccess(res, {
      days: days.map(serializeTripDay),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };
}

export const itineraryController = new ItineraryController();
