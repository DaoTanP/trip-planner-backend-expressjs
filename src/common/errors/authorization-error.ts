import { HTTP_STATUS } from '@/common/constants/http-status.js';
import {
  AppError,
  type AppErrorMessageInput,
  resolveErrorMessageInput
} from '@/common/errors/app-error.js';

export class AuthorizationError extends AppError {
  constructor(input?: AppErrorMessageInput) {
    super({
      ...resolveErrorMessageInput(input, { messageKey: 'errors.authorization.forbidden' }),
      statusCode: HTTP_STATUS.FORBIDDEN,
      code: 'FORBIDDEN'
    });
  }
}
