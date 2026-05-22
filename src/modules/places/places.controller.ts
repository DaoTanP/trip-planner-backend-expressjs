import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { serializePlace } from '@/api/serializers/trip.serializer.js';
import { sendCreated, sendSuccess } from '@/common/utils/response.js';
import type {
  CreatePlaceInput,
  ListPlacesQuery,
  PlaceIdParams,
  SearchPlacesQuery
} from '@/modules/places/places.schemas.js';
import { placesService, type PlacesService } from '@/modules/places/places.service.js';

export class PlacesController {
  constructor(private readonly service: PlacesService = placesService) {}

  list = async (
    req: Request<ParamsDictionary, unknown, unknown, ListPlacesQuery>,
    res: Response
  ) => {
    const places = await this.service.listPlaces(req.query);
    return sendSuccess(res, { places: places.map(serializePlace) });
  };

  search = async (
    req: Request<ParamsDictionary, unknown, unknown, SearchPlacesQuery>,
    res: Response
  ) => {
    const places = await this.service.searchPlaces(req.query);
    return sendSuccess(res, { places: places.map(serializePlace) });
  };

  get = async (req: Request<PlaceIdParams>, res: Response) => {
    const place = await this.service.getPlace(req.params.placeId);
    return sendSuccess(res, { place: serializePlace(place) });
  };

  create = async (req: Request<ParamsDictionary, unknown, CreatePlaceInput>, res: Response) => {
    const place = await this.service.createPlace(req.body);
    return sendCreated(res, { place: serializePlace(place) });
  };
}

export const placesController = new PlacesController();
