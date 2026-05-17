import type { Request, Response } from 'express';

import { sendCreated, sendSuccess } from '@/common/utils/response.js';
import type { CreatePlaceInput, ListPlacesQuery } from '@/modules/places/places.schemas.js';
import { placesService, type PlacesService } from '@/modules/places/places.service.js';

export class PlacesController {
  constructor(private readonly service: PlacesService = placesService) {}

  list = async (req: Request<unknown, unknown, unknown, ListPlacesQuery>, res: Response) => {
    const places = await this.service.listPlaces(req.query);
    return sendSuccess(res, { places });
  };

  create = async (req: Request<unknown, unknown, CreatePlaceInput>, res: Response) => {
    const place = await this.service.createPlace(req.body);
    return sendCreated(res, { place });
  };
}

export const placesController = new PlacesController();
