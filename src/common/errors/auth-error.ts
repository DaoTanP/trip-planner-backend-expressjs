import { HTTP_STATUS } from '@/common/constants/http-status.js';
import {
  AppError,
  type AppErrorMessageInput,
  resolveErrorMessageInput
} from '@/common/errors/app-error.js';

export class AuthError extends AppError {
  constructor(input?: AppErrorMessageInput) {
    const messageInput = resolveErrorMessageInput(input, {
      messageKey: 'errors.auth.failed',
      code: 'AUTHENTICATION_FAILED'
    });

    super({
      ...messageInput,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: messageInput.code ?? 'AUTHENTICATION_FAILED'
    });
  }
}
