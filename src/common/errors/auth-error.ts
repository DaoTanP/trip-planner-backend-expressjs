import { HTTP_STATUS } from '@/common/constants/http-status.js';
import { AppError } from '@/common/errors/app-error.js';

export class AuthError extends AppError {
  constructor(message = 'Authentication failed') {
    super({
      message,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: 'AUTHENTICATION_FAILED'
    });
  }
}
