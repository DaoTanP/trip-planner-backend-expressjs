import { ActivityStatus } from '@prisma/client';
import { z } from 'zod';

import { DEFAULT_TIMEZONE } from '@/common/localization/locales.js';
import { dateOnlyStringSchema, timezoneSchema } from '@/common/localization/schemas.js';

const uuidParam = z.string().uuid();
const dateOnlySchema = dateOnlyStringSchema;
const dateTimeSchema = z.string().datetime();

export const listDaysSchema = z.object({
  params: z.object({
    tripId: uuidParam
  })
});

export const createDaySchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  body: z.object({
    date: dateOnlySchema,
    title: z.string().trim().min(1).max(160).optional(),
    notes: z.string().trim().max(5000).optional(),
    order: z.number().int().min(0).default(0),
    weatherSnapshot: z.record(z.unknown()).optional()
  })
});

export const createActivitySchema = z.object({
  params: z.object({
    dayId: uuidParam
  }),
  body: z
    .object({
      placeId: uuidParam.optional(),
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().max(5000).optional(),
      startTime: dateTimeSchema.optional(),
      endTime: dateTimeSchema.optional(),
      timezone: timezoneSchema.default(DEFAULT_TIMEZONE),
      status: z.nativeEnum(ActivityStatus).default(ActivityStatus.PLANNED),
      cost: z.number().nonnegative().optional(),
      currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).optional(),
      bookingInfo: z.record(z.unknown()).optional(),
      metadata: z.record(z.unknown()).optional(),
      order: z.number().int().min(0).default(0)
    })
    .refine(
      (value) => !value.startTime || !value.endTime || value.startTime <= value.endTime,
      { message: 'validation.timeRange.startBeforeEnd' }
    )
});

export const updateActivitySchema = z.object({
  params: z.object({
    activityId: uuidParam
  }),
  body: z
    .object({
      placeId: uuidParam.nullable().optional(),
      title: z.string().trim().min(1).max(180).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
      startTime: dateTimeSchema.nullable().optional(),
      endTime: dateTimeSchema.nullable().optional(),
      timezone: timezoneSchema.optional(),
      status: z.nativeEnum(ActivityStatus).optional(),
      cost: z.number().nonnegative().nullable().optional(),
      currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).nullable().optional(),
      bookingInfo: z.record(z.unknown()).nullable().optional(),
      metadata: z.record(z.unknown()).nullable().optional(),
      order: z.number().int().min(0).optional()
    })
    .refine(
      (value) => !value.startTime || !value.endTime || value.startTime <= value.endTime,
      { message: 'validation.timeRange.startBeforeEnd' }
    )
});

export const activityIdSchema = z.object({
  params: z.object({
    activityId: uuidParam
  })
});

export type ListDaysParams = z.infer<typeof listDaysSchema>['params'];
export type CreateDayInput = z.infer<typeof createDaySchema>['body'];
export type CreateDayParams = z.infer<typeof createDaySchema>['params'];
export type CreateActivityInput = z.infer<typeof createActivitySchema>['body'];
export type CreateActivityParams = z.infer<typeof createActivitySchema>['params'];
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>['body'];
export type ActivityIdParams = z.infer<typeof activityIdSchema>['params'];
