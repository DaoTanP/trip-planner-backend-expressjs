import type { Response } from 'express';

import { HTTP_STATUS } from '@/common/constants/http-status.js';

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown>,
  statusCode = HTTP_STATUS.OK
) => res.status(statusCode).json({ success: true, data, ...(meta ? { meta } : {}) } satisfies ApiSuccess<T>);

export const sendCreated = <T>(res: Response, data: T) => sendSuccess(res, data, undefined, HTTP_STATUS.CREATED);

export const sendNoContent = (res: Response) => res.status(HTTP_STATUS.NO_CONTENT).send();
