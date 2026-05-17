import { TripStatus, TripVisibility } from '@prisma/client';
import { z } from 'zod';

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format');
const uuidParam = z.string().uuid();

export const listTripsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(TripStatus).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20)
  })
});

export const tripIdSchema = z.object({
  params: z.object({
    tripId: uuidParam
  })
});

export const createTripSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(2).max(180),
      description: z.string().trim().max(5000).optional(),
      startDate: dateOnlySchema.optional(),
      endDate: dateOnlySchema.optional(),
      timezone: z.string().trim().min(1).max(80).default('UTC'),
      visibility: z.nativeEnum(TripVisibility).default(TripVisibility.PRIVATE),
      preferences: z.record(z.unknown()).optional(),
      budget: z.record(z.unknown()).optional()
    })
    .refine(
      (value) => !value.startDate || !value.endDate || value.startDate <= value.endDate,
      'startDate must be before or equal to endDate'
    )
});

export const updateTripSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  body: z
    .object({
      title: z.string().trim().min(2).max(180).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
      startDate: dateOnlySchema.nullable().optional(),
      endDate: dateOnlySchema.nullable().optional(),
      timezone: z.string().trim().min(1).max(80).optional(),
      visibility: z.nativeEnum(TripVisibility).optional(),
      status: z.nativeEnum(TripStatus).optional(),
      coverImageUrl: z.string().url().nullable().optional(),
      preferences: z.record(z.unknown()).nullable().optional(),
      budget: z.record(z.unknown()).nullable().optional(),
      metadata: z.record(z.unknown()).nullable().optional()
    })
    .refine(
      (value) => !value.startDate || !value.endDate || value.startDate <= value.endDate,
      'startDate must be before or equal to endDate'
    )
});

export type ListTripsQuery = z.infer<typeof listTripsSchema>['query'];
export type TripIdParams = z.infer<typeof tripIdSchema>['params'];
export type CreateTripInput = z.infer<typeof createTripSchema>['body'];
export type UpdateTripInput = z.infer<typeof updateTripSchema>['body'];
