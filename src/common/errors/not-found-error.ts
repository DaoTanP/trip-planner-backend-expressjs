import { HTTP_STATUS } from '@/common/constants/http-status.js';
import { AppError } from '@/common/errors/app-error.js';

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super({
      message: `${resource} not found`,
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: 'NOT_FOUND'
    });
  }
}
