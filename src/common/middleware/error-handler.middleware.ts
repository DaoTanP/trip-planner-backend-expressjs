import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { AppError } from '@/common/errors/app-error.js';
import { ConflictError } from '@/common/errors/conflict-error.js';
import { NotFoundError } from '@/common/errors/not-found-error.js';
import { ValidationError } from '@/common/errors/validation-error.js';
import { logger } from '@/common/logger/logger.js';
import { env } from '@/config/env.js';

const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError(
      'Validation failed',
      error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ConflictError('A record with the same unique value already exists');
    }
    if (error.code === 'P2025') {
      return new NotFoundError();
    }
  }

  return new AppError({
    message: 'Internal server error',
    isOperational: false
  });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = normalizeError(error);

  if (!appError.isOperational || appError.statusCode >= 500) {
    logger.error({ err: error, requestId: req.id }, appError.message);
  } else {
    logger.warn({ err: appError, requestId: req.id }, appError.message);
  }

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
      ...(!env.isProduction && error instanceof Error ? { stack: error.stack } : {})
    }
  });
};
