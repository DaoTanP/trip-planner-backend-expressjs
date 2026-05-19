import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';

export const asyncHandler =
  <Params extends ParamsDictionary = ParamsDictionary, ResBody = unknown, ReqBody = unknown, ReqQuery = Query>(
    handler: (
      req: Request<Params, ResBody, ReqBody, ReqQuery>,
      res: Response<ResBody>,
      next: NextFunction
    ) => Promise<unknown>
  ): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(
      handler(
        req as Request<Params, ResBody, ReqBody, ReqQuery>,
        res as Response<ResBody>,
        next
      )
    ).catch(next);
  };
