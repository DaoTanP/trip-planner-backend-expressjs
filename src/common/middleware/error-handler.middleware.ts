import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { AppError } from '@/common/errors/app-error.js';
import { ConflictError } from '@/common/errors/conflict-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { ValidationError } from '@/common/errors/validation-error.js';
import { DEFAULT_LOCALE, type Locale } from '@/common/localization/locales.js';
import { formatZodIssues } from '@/common/localization/validation.js';
import { translate } from '@/common/localization/translator.js';
import { logger } from '@/common/logger/logger.js';
import { env } from '@/config/env.js';

const normalizeError = (error: unknown, locale: Locale): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError({
      messageKey: 'errors.validation.generic',
      details: formatZodIssues(error.issues, locale)
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ConflictError({ messageKey: 'errors.conflict.uniqueValue' });
    }
    if (error.code === 'P2025') {
      return new NotFoundError();
    }
  }

  return new AppError({
    messageKey: 'errors.internal',
    isOperational: false
  });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const locale = req.locale ?? DEFAULT_LOCALE;
  const appError = normalizeError(error, locale);
  const message = appError.messageKey
    ? appError.messageParams
      ? translate(appError.messageKey, { locale, params: appError.messageParams })
      : translate(appError.messageKey, { locale })
    : appError.message;

  if (!appError.isOperational || appError.statusCode >= 500) {
    logger.error({ err: error, requestId: req.id }, appError.message);
  } else {
    logger.warn({ err: appError, requestId: req.id }, appError.message);
  }

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message,
      requestId: req.id,
      ...(appError.details ? { details: appError.details } : {}),
      ...(!env.isProduction && error instanceof Error ? { stack: error.stack } : {})
    }
  });
};
