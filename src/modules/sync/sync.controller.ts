import type { Request, Response } from 'express';

import { serializeMutationEvent } from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import { sendSuccess } from '@/common/utils/response.js';
import type {
  ListMutationEventsParams,
  ListMutationEventsQuery
} from '@/modules/sync/sync.schemas.js';
import { syncService, type SyncService } from '@/modules/sync/sync.service.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class SyncController {
  constructor(private readonly service: SyncService = syncService) {}

  listMutationEvents = async (
    req: Request<ListMutationEventsParams, unknown, unknown, ListMutationEventsQuery>,
    res: Response
  ) => {
    const result = await this.service.listMutationEvents(
      requireUserId(req),
      req.params.tripId,
      req.query
    );

    return sendSuccess(res, {
      events: result.events.map(serializeMutationEvent),
      latestRevision: result.latestRevision.toString(),
      hasMore: result.hasMore,
      nextCursor: result.nextCursor
    });
  };
}

export const syncController = new SyncController();
