import type { Request, Response } from 'express';

import { serializeRouteSegment } from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import { sendCursorPaginated } from '@/common/utils/response.js';
import { routesService, type RoutesService } from '@/modules/routes/routes.service.js';
import type { ListTripRoutesParams, ListTripRoutesQuery } from '@/modules/routes/routes.schemas.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class RoutesController {
  constructor(private readonly service: RoutesService = routesService) {}

  list = async (
    req: Request<ListTripRoutesParams, unknown, unknown, ListTripRoutesQuery>,
    res: Response
  ) => {
    const result = await this.service.listRoutes(requireUserId(req), req.params.tripId, req.query);
    return sendCursorPaginated(
      res,
      { routes: result.items.map(serializeRouteSegment) },
      result.pagination
    );
  };
}

export const routesController = new RoutesController();
