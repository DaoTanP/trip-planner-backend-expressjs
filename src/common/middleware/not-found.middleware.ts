import type { RequestHandler } from 'express';

import { NotFoundError } from '@/common/errors/not-found-error.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(
    new NotFoundError({
      messageKey: 'errors.notFound.route',
      messageParams: { route: `${req.method} ${req.originalUrl}` }
    })
  );
};
