import { HTTP_STATUS } from '@/common/constants/http-status.js';

export type ErrorDetails = Record<string, unknown> | Array<Record<string, unknown>>;

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: ErrorDetails;
  readonly isOperational: boolean;

  constructor({
    message,
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code = 'INTERNAL_SERVER_ERROR',
    details,
    isOperational = true
  }: {
    message: string;
    statusCode?: number;
    code?: string;
    details?: ErrorDetails;
    isOperational?: boolean;
  }) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, new.target);
  }
}
