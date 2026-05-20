import type { Response } from 'express';

import type { ApiMeta, ApiSuccessResponse, PaginationMeta } from '@/api/contracts/index.js';
import { HTTP_STATUS } from '@/common/constants/http-status.js';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  meta?: ApiMeta,
  statusCode: number = HTTP_STATUS.OK
) =>
  res
    .status(statusCode)
    .json({ success: true, data, ...(meta ? { meta } : {}) } satisfies ApiSuccessResponse<T>);

export const sendCreated = <T>(res: Response, data: T) => sendSuccess(res, data, undefined, HTTP_STATUS.CREATED);

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  meta?: Omit<ApiMeta, 'pagination'>
) => sendSuccess(res, data, { ...meta, pagination });

export const sendNoContent = (res: Response) => res.status(HTTP_STATUS.NO_CONTENT).send();
