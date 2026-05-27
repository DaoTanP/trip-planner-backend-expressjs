import type { Request, Response } from 'express';

import { serializeItineraryItem, serializePlace } from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import {
  sendCreated,
  sendCursorPaginated,
  sendNoContent,
  sendSuccess
} from '@/common/utils/response.js';
import { itineraryService, type ItineraryService } from '@/modules/itinerary/itinerary.service.js';
import type {
  CreateItineraryItemInput,
  CreateTripItineraryItemParams,
  ItineraryItemIdParams,
  ListItineraryParams,
  ListItineraryQuery,
  ReorderItineraryItemsInput,
  ReorderItineraryItemsParams,
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

  listItems = async (
    req: Request<ListItineraryParams, unknown, unknown, ListItineraryQuery>,
    res: Response
  ) => {
    const result = await this.service.listItems(requireUserId(req), req.params.tripId, req.query);
    return sendCursorPaginated(
      res,
      { items: result.items.map(serializeItineraryItem) },
      result.pagination
    );
  };

  listPlaces = async (req: Request<ListItineraryParams>, res: Response) => {
    const places = await this.service.listPlacesForTrip(requireUserId(req), req.params.tripId);
    return sendSuccess(res, { places: places.map(serializePlace) });
  };

  createTripItineraryItem = async (
    req: Request<CreateTripItineraryItemParams, unknown, CreateItineraryItemInput>,
    res: Response
  ) => {
    const item = await this.service.createItineraryItem(
      requireUserId(req),
      req.params.tripId,
      req.body
    );
    return sendCreated(res, {
      item: serializeItineraryItem(item),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
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
    return sendSuccess(res, {
      item: serializeItineraryItem(item),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };

  deleteItineraryItem = async (req: Request<ItineraryItemIdParams>, res: Response) => {
    await this.service.deleteItineraryItem(requireUserId(req), req.params.itemId);
    return sendNoContent(res);
  };

  reorderItineraryItems = async (
    req: Request<ReorderItineraryItemsParams, unknown, ReorderItineraryItemsInput>,
    res: Response
  ) => {
    const result = await this.service.reorderItineraryItems(
      requireUserId(req),
      req.params.tripId,
      req.body
    );
    return sendSuccess(res, {
      item: serializeItineraryItem(result.item),
      affectedItems: result.affectedItems.map(serializeItineraryItem),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };
}

export const itineraryController = new ItineraryController();
