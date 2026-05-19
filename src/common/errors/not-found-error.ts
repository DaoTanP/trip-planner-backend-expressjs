import { HTTP_STATUS } from '@/common/constants/http-status.js';
import {
  AppError,
  type AppErrorMessageInput,
  resolveErrorMessageInput
} from '@/common/errors/app-error.js';
import type { ResourceMessageKey } from '@/common/localization/messages.js';

type NotFoundResourceInput = {
  resourceKey?: ResourceMessageKey;
  resource?: string;
};

type NotFoundErrorInput = AppErrorMessageInput | NotFoundResourceInput;

const isResourceInput = (input: NotFoundErrorInput | undefined): input is NotFoundResourceInput =>
  typeof input === 'object' && input !== null && ('resourceKey' in input || 'resource' in input);

export class NotFoundError extends AppError {
  constructor(input?: NotFoundErrorInput) {
    const messageInput = isResourceInput(input)
      ? {
          messageKey: 'errors.notFound.resource' as const,
          messageParams: {
            resource: input.resource ?? {
              messageKey: input.resourceKey ?? 'resources.resource'
            }
          }
        }
      : resolveErrorMessageInput(input, {
          messageKey: 'errors.notFound.resource',
          messageParams: { resource: { messageKey: 'resources.resource' } }
        });

    super({
      ...messageInput,
      statusCode: HTTP_STATUS.NOT_FOUND,
      code: 'NOT_FOUND'
    });
  }
}
