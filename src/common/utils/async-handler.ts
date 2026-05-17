import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const asyncHandler =
  <Params = unknown, ResBody = unknown, ReqBody = unknown, ReqQuery = unknown>(
    handler: (
      req: Request<Params, ResBody, ReqBody, ReqQuery>,
      res: Response<ResBody>,
      next: NextFunction
    ) => Promise<unknown>
  ): RequestHandler<Params, ResBody, ReqBody, ReqQuery> =>
  (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
