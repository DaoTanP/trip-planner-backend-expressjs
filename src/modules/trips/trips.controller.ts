import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import {
  serializeTripDetail,
  serializeTripNote,
  serializeTripSummary
} from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import { sendCreated, sendNoContent, sendPaginated, sendSuccess } from '@/common/utils/response.js';
import type {
  CreateTripInput,
  CreateTripNoteInput,
  CreateTripNoteParams,
  ListTripsQuery,
  TripNoteIdParams,
  TripIdParams,
  UpdateTripNoteInput,
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

  createNote = async (
    req: Request<CreateTripNoteParams, unknown, CreateTripNoteInput>,
    res: Response
  ) => {
    const note = await this.service.createTripNote(requireUserId(req), req.params.tripId, req.body);
    return sendCreated(res, { note: serializeTripNote(note) });
  };

  updateNote = async (
    req: Request<TripNoteIdParams, unknown, UpdateTripNoteInput>,
    res: Response
  ) => {
    const note = await this.service.updateTripNote(requireUserId(req), req.params.noteId, req.body);
    return sendSuccess(res, { note: serializeTripNote(note) });
  };

  deleteNote = async (req: Request<TripNoteIdParams>, res: Response) => {
    await this.service.deleteTripNote(requireUserId(req), req.params.noteId);
    return sendNoContent(res);
  };
}

export const tripsController = new TripsController();
