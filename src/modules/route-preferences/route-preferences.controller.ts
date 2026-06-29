import type { Request, Response } from 'express';

import { serializeTripRoutePreference } from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import { sendSuccess } from '@/common/utils/response.js';

import {
  routePreferencesService,
  type RoutePreferencesService
} from './route-preferences.service.js';
import type {
  ListTripRoutePreferencesParams,
  UpsertTripRoutePreferenceInput,
  UpsertTripRoutePreferenceParams
} from './route-preferences.schemas.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class RoutePreferencesController {
  constructor(private readonly service: RoutePreferencesService = routePreferencesService) {}

  listTripRoutePreferences = async (
    req: Request<ListTripRoutePreferencesParams>,
    res: Response
  ) => {
    const routePreferences = await this.service.listTripRoutePreferences(
      requireUserId(req),
      req.params.tripId
    );

    return sendSuccess(res, {
      routePreferences: routePreferences.map(serializeTripRoutePreference)
    });
  };

  upsertTripRoutePreference = async (
    req: Request<UpsertTripRoutePreferenceParams, unknown, UpsertTripRoutePreferenceInput>,
    res: Response
  ) => {
    const result = await this.service.upsertTripRoutePreference(
      requireUserId(req),
      req.params,
      req.body
    );

    return sendSuccess(res, {
      routePreference: serializeTripRoutePreference(result.routePreference),
      revision: result.revision.toString(),
      ...(req.body.clientMutationId ? { clientMutationId: req.body.clientMutationId } : {})
    });
  };
}

export const routePreferencesController = new RoutePreferencesController();
