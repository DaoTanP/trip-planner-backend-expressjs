import { HTTP_STATUS } from '@/common/constants/http-status.js';
import { AppError } from '@/common/errors/app-error.js';

export type RevisionConflictDetails = {
  currentRevision: string;
  latestTripRevision: string;
  entityVersion?: number | undefined;
  latestEntity?: Record<string, unknown> | null | undefined;
};

export class RevisionConflictError extends AppError {
  constructor(details: RevisionConflictDetails) {
    const errorDetails: RevisionConflictDetails = {
      currentRevision: details.currentRevision,
      latestTripRevision: details.latestTripRevision
    };

    if (details.entityVersion !== undefined) {
      errorDetails.entityVersion = details.entityVersion;
    }
    if (details.latestEntity !== undefined) {
      errorDetails.latestEntity = details.latestEntity;
    }

    super({
      message: 'Revision conflict',
      statusCode: HTTP_STATUS.CONFLICT,
      code: 'REVISION_CONFLICT',
      details: errorDetails
    });
  }
}
