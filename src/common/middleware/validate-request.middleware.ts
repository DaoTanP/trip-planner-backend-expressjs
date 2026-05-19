import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';

import { ValidationError } from '@/common/errors/validation-error.js';
import { DEFAULT_LOCALE } from '@/common/localization/locales.js';
import { formatZodIssues } from '@/common/localization/validation.js';

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
          new ValidationError({
            messageKey: 'errors.validation.request',
            details: formatZodIssues(error.issues, req.locale ?? DEFAULT_LOCALE)
          })
        );
        return;
      }

      next(error);
    }
  };
