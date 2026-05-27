import { normalizeCursorLimit } from '@/common/utils/cursor-pagination.js';
import {
  commentsRepository,
  type CommentsRepository
} from '@/modules/comments/comments.repository.js';
import type { ListCommentsQuery } from '@/modules/comments/comments.schemas.js';
import { tripsService, type TripsService } from '@/modules/trips/trips.service.js';

export class CommentsService {
  constructor(
    private readonly repository: CommentsRepository = commentsRepository,
    private readonly trips: TripsService = tripsService
  ) {}

  async listComments(userId: string, tripId: string, query: ListCommentsQuery) {
    await this.trips.ensureCanAccessTrip(userId, tripId);

    return this.repository.listForTrip(tripId, {
      cursor: query.cursor,
      limit: normalizeCursorLimit(query.limit),
      targetEntityType: query.targetEntityType,
      targetEntityId: query.targetEntityId
    });
  }
}

export const commentsService = new CommentsService();
