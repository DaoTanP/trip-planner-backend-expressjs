import { HTTP_STATUS } from '@/common/constants/http-status.js';
import { AppError } from '@/common/errors/app-error.js';

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super({
      message,
      statusCode: HTTP_STATUS.CONFLICT,
      code: 'CONFLICT'
    });
  }
}
