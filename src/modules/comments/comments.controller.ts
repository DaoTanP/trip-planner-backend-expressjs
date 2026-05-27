import type { Request, Response } from 'express';

import { serializeComment } from '@/api/serializers/trip.serializer.js';
import { AuthError } from '@/common/errors/auth-error.js';
import { sendCursorPaginated } from '@/common/utils/response.js';
import {
  commentsService,
  type CommentsService
} from '@/modules/comments/comments.service.js';
import type {
  ListCommentsParams,
  ListCommentsQuery
} from '@/modules/comments/comments.schemas.js';

const requireUserId = (req: { user?: Request['user'] }): string => {
  if (!req.user) {
    throw new AuthError({ messageKey: 'errors.auth.missingUser' });
  }

  return req.user.id;
};

export class CommentsController {
  constructor(private readonly service: CommentsService = commentsService) {}

  list = async (
    req: Request<ListCommentsParams, unknown, unknown, ListCommentsQuery>,
    res: Response
  ) => {
    const result = await this.service.listComments(
      requireUserId(req),
      req.params.tripId,
      req.query
    );
    return sendCursorPaginated(
      res,
      { comments: result.items.map(serializeComment) },
      result.pagination
    );
  };
}

export const commentsController = new CommentsController();
