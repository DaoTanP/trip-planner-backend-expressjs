import type { ErrorDetails } from '@/common/errors/app-error.js';
import { AppError } from '@/common/errors/app-error.js';
import { HTTP_STATUS } from '@/common/constants/http-status.js';

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: ErrorDetails) {
    super({
      message,
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: 'VALIDATION_ERROR',
      details
    });
  }
}
