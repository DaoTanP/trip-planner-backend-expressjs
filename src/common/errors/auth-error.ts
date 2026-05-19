import { HTTP_STATUS } from '@/common/constants/http-status.js';
import {
  AppError,
  type AppErrorMessageInput,
  resolveErrorMessageInput
} from '@/common/errors/app-error.js';

export class AuthError extends AppError {
  constructor(input?: AppErrorMessageInput) {
    super({
      ...resolveErrorMessageInput(input, { messageKey: 'errors.auth.failed' }),
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: 'AUTHENTICATION_FAILED'
    });
  }
}
