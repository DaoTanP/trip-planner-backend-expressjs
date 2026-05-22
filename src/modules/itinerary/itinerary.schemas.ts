import { ItineraryItemStatus } from '@prisma/client';
import { z } from 'zod';

import { DEFAULT_TIMEZONE } from '@/common/localization/locales.js';
import { dateOnlyStringSchema, timezoneSchema } from '@/common/localization/schemas.js';

const uuidParam = z.string().uuid();
const dateOnlySchema = dateOnlyStringSchema;
const dateTimeSchema = z.string().datetime();
const routePolylineSchema = z.string().trim().max(20000);

const itineraryItemPayloadShape = {
  dayId: uuidParam.optional(),
  placeId: uuidParam.nullable().optional(),
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  startTime: dateTimeSchema.nullable().optional(),
  endTime: dateTimeSchema.nullable().optional(),
  timezone: timezoneSchema.optional(),
  status: z.nativeEnum(ItineraryItemStatus).optional(),
  cost: z.number().nonnegative().nullable().optional(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase())
    .nullable()
    .optional(),
  durationMinutes: z.number().int().nonnegative().nullable().optional(),
  travelMode: z.string().trim().min(1).max(40).nullable().optional(),
  travelTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  routePolyline: routePolylineSchema.nullable().optional(),
  bookingInfo: z.record(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  order: z.number().int().min(0).optional()
} as const;

const itineraryItemPayloadSchema = z
  .object(itineraryItemPayloadShape)
  .refine((value) => !value.startTime || !value.endTime || value.startTime <= value.endTime, {
    message: 'validation.timeRange.startBeforeEnd'
  });

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

export const updateDaySchema = z.object({
  params: z.object({
    dayId: uuidParam
  }),
  body: z.object({
    date: dateOnlySchema.optional(),
    title: z.string().trim().min(1).max(160).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    order: z.number().int().min(0).optional(),
    weatherSnapshot: z.record(z.unknown()).nullable().optional()
  })
});

export const reorderDaysSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  body: z.object({
    dayIds: z.array(uuidParam).min(1).max(500),
    clientMutationId: z.string().trim().max(120).optional()
  })
});

export const dayIdSchema = z.object({
  params: z.object({
    dayId: uuidParam
  })
});

export const createItineraryItemSchema = z.object({
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
      status: z.nativeEnum(ItineraryItemStatus).default(ItineraryItemStatus.PLANNED),
      cost: z.number().nonnegative().optional(),
      currency: z
        .string()
        .trim()
        .length(3)
        .transform((value) => value.toUpperCase())
        .optional(),
      durationMinutes: z.number().int().nonnegative().optional(),
      travelMode: z.string().trim().min(1).max(40).optional(),
      travelTimeMinutes: z.number().int().nonnegative().optional(),
      routePolyline: routePolylineSchema.optional(),
      bookingInfo: z.record(z.unknown()).optional(),
      metadata: z.record(z.unknown()).optional(),
      order: z.number().int().min(0).default(0)
    })
    .refine((value) => !value.startTime || !value.endTime || value.startTime <= value.endTime, {
      message: 'validation.timeRange.startBeforeEnd'
    })
});

export const updateItineraryItemSchema = z.object({
  params: z.object({
    itemId: uuidParam
  }),
  body: itineraryItemPayloadSchema
});

export const reorderItineraryItemsSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  body: z.object({
    updates: z
      .array(
        z.object({
          itemId: uuidParam,
          dayId: uuidParam,
          order: z.number().int().min(0)
        })
      )
      .min(1)
      .max(1000),
    clientMutationId: z.string().trim().max(120).optional()
  })
});

export const itineraryItemIdSchema = z.object({
  params: z.object({
    itemId: uuidParam
  })
});

export type ListDaysParams = z.infer<typeof listDaysSchema>['params'];
export type CreateDayInput = z.infer<typeof createDaySchema>['body'];
export type CreateDayParams = z.infer<typeof createDaySchema>['params'];
export type UpdateDayInput = z.infer<typeof updateDaySchema>['body'];
export type DayIdParams = z.infer<typeof dayIdSchema>['params'];
export type ReorderDaysInput = z.infer<typeof reorderDaysSchema>['body'];
export type ReorderDaysParams = z.infer<typeof reorderDaysSchema>['params'];
export type CreateItineraryItemInput = z.infer<typeof createItineraryItemSchema>['body'];
export type CreateItineraryItemParams = z.infer<typeof createItineraryItemSchema>['params'];
export type UpdateItineraryItemInput = z.infer<typeof updateItineraryItemSchema>['body'];
export type ItineraryItemIdParams = z.infer<typeof itineraryItemIdSchema>['params'];
export type ReorderItineraryItemsInput = z.infer<typeof reorderItineraryItemsSchema>['body'];
export type ReorderItineraryItemsParams = z.infer<typeof reorderItineraryItemsSchema>['params'];
