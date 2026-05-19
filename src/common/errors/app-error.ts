import { HTTP_STATUS } from '@/common/constants/http-status.js';
import { DEFAULT_LOCALE } from '@/common/localization/locales.js';
import type { MessageKey } from '@/common/localization/messages.js';
import { translate, type MessageParams } from '@/common/localization/translator.js';

export type ErrorDetails = Record<string, unknown> | Array<Record<string, unknown>>;

export type AppErrorMessageInput =
  | string
  | {
      message?: string;
      messageKey?: MessageKey;
      messageParams?: MessageParams;
      details?: ErrorDetails;
    };

export type AppErrorMessageOptions = {
  message?: string;
  messageKey?: MessageKey;
  messageParams?: MessageParams;
  details?: ErrorDetails;
};

export const resolveErrorMessageInput = (
  input: AppErrorMessageInput | undefined,
  defaults: AppErrorMessageOptions
): AppErrorMessageOptions => {
  const options: AppErrorMessageOptions = {};

  if (defaults.message !== undefined) options.message = defaults.message;
  if (defaults.messageKey !== undefined) options.messageKey = defaults.messageKey;
  if (defaults.messageParams !== undefined) options.messageParams = defaults.messageParams;
  if (defaults.details !== undefined) options.details = defaults.details;

  if (typeof input === 'string') {
    options.message = input;
    return options;
  }

  if (!input) {
    return options;
  }

  if (input.message !== undefined) options.message = input.message;
  if (input.messageKey !== undefined) options.messageKey = input.messageKey;
  if (input.messageParams !== undefined) options.messageParams = input.messageParams;
  if (input.details !== undefined) options.details = input.details;

  return options;
};

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ErrorDetails;
  readonly isOperational: boolean;
  readonly messageKey?: MessageKey;
  readonly messageParams?: MessageParams;

  constructor({
    message,
    messageKey,
    messageParams,
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code = 'INTERNAL_SERVER_ERROR',
    details,
    isOperational = true
  }: {
    message?: string;
    messageKey?: MessageKey;
    messageParams?: MessageParams;
    statusCode?: number;
    code?: string;
    details?: ErrorDetails;
    isOperational?: boolean;
  }) {
    const translatedMessage = messageKey
      ? messageParams
        ? translate(messageKey, { locale: DEFAULT_LOCALE, params: messageParams })
        : translate(messageKey, { locale: DEFAULT_LOCALE })
      : translate('errors.internal', { locale: DEFAULT_LOCALE });

    super(message ?? translatedMessage);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    if (details !== undefined) this.details = details;
    if (messageKey !== undefined) this.messageKey = messageKey;
    if (messageParams !== undefined) this.messageParams = messageParams;

    Error.captureStackTrace(this, new.target);
  }
}
