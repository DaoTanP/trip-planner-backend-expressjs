import { HTTP_STATUS } from '@/common/constants/http-status.js';
import { AppError } from '@/common/errors/app-error.js';

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super({
      message,
      statusCode: HTTP_STATUS.FORBIDDEN,
      code: 'FORBIDDEN'
    });
  }
}
