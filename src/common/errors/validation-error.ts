import type { ErrorDetails } from '@/common/errors/app-error.js';
import {
  AppError,
  type AppErrorMessageInput,
  resolveErrorMessageInput
} from '@/common/errors/app-error.js';
import { HTTP_STATUS } from '@/common/constants/http-status.js';

export class ValidationError extends AppError {
  constructor(input?: AppErrorMessageInput, details?: ErrorDetails) {
    const messageInput = resolveErrorMessageInput(input, { messageKey: 'errors.validation.generic' });
    if (details !== undefined) {
      messageInput.details = details;
    }

    super({
      ...messageInput,
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: 'VALIDATION_ERROR'
    });
  }
}
