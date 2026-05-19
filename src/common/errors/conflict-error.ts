import { HTTP_STATUS } from '@/common/constants/http-status.js';
import {
  AppError,
  type AppErrorMessageInput,
  resolveErrorMessageInput
} from '@/common/errors/app-error.js';

export class ConflictError extends AppError {
  constructor(input?: AppErrorMessageInput) {
    super({
      ...resolveErrorMessageInput(input, { messageKey: 'errors.conflict.resource' }),
      statusCode: HTTP_STATUS.CONFLICT,
      code: 'CONFLICT'
    });
  }
}
