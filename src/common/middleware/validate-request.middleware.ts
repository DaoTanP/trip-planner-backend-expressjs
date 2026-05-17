import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';

import { ValidationError } from '@/common/errors/validation-error.js';

type RequestParts = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

export const validateRequest =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      }) as RequestParts;

      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.query !== undefined) {
        req.query = parsed.query as typeof req.query;
      }
      if (parsed.params !== undefined) {
        req.params = parsed.params as typeof req.params;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            'Request validation failed',
            error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code
            }))
          )
        );
        return;
      }

      next(error);
    }
  };
