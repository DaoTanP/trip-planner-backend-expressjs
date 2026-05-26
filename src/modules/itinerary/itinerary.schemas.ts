import { ItineraryItemStatus, ItineraryItemType } from '@prisma/client';
import { z } from 'zod';

import { DEFAULT_TIMEZONE } from '@/common/localization/locales.js';
import { timezoneSchema } from '@/common/localization/schemas.js';

const uuidParam = z.string().uuid();
const dateTimeSchema = z.string().datetime();
const clientMutationIdSchema = z.string().trim().max(120).optional();

const itineraryItemPayloadShape = {
  placeId: uuidParam.nullable().optional(),
  routeSegmentId: uuidParam.nullable().optional(),
  type: z.nativeEnum(ItineraryItemType).optional(),
  title: z.string().trim().min(1).max(180).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  timezone: timezoneSchema.optional(),
  startTime: dateTimeSchema.nullable().optional(),
  endTime: dateTimeSchema.nullable().optional(),
  isFlexibleTime: z.boolean().optional(),
  isAllDay: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
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
  bookingInfo: z.record(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  expectedVersion: z.number().int().positive().optional(),
  clientMutationId: clientMutationIdSchema
} as const;

const itineraryItemPayloadSchema = z
  .object(itineraryItemPayloadShape)
  .refine((value) => !value.startTime || !value.endTime || value.startTime <= value.endTime, {
    message: 'validation.timeRange.startBeforeEnd'
  });

export const listItinerarySchema = z.object({
  params: z.object({
    tripId: uuidParam
  })
});

export const createTripItineraryItemSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  body: z
    .object({
      placeId: uuidParam.nullable().optional(),
      routeSegmentId: uuidParam.nullable().optional(),
      type: z.nativeEnum(ItineraryItemType).default(ItineraryItemType.ACTIVITY),
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().max(5000).optional(),
      timezone: timezoneSchema.default(DEFAULT_TIMEZONE),
      startTime: dateTimeSchema.optional(),
      endTime: dateTimeSchema.optional(),
      isFlexibleTime: z.boolean().default(true),
      isAllDay: z.boolean().default(false),
      sortOrder: z.number().int().min(0).optional(),
      status: z.nativeEnum(ItineraryItemStatus).default(ItineraryItemStatus.PLANNED),
      cost: z.number().nonnegative().optional(),
      currency: z
        .string()
        .trim()
        .length(3)
        .transform((value) => value.toUpperCase())
        .optional(),
      durationMinutes: z.number().int().nonnegative().optional(),
      bookingInfo: z.record(z.unknown()).optional(),
      metadata: z.record(z.unknown()).optional(),
      clientMutationId: clientMutationIdSchema
    })
    .refine((value) => !value.startTime || !value.endTime || value.startTime <= value.endTime, {
      message: 'validation.timeRange.startBeforeEnd'
    })
});

export const createLegacyDayItineraryItemSchema = z.object({
  params: z.object({
    dayId: uuidParam
  }),
  body: createTripItineraryItemSchema.shape.body
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
          sortOrder: z.number().int().min(0),
          expectedVersion: z.number().int().positive().optional()
        })
      )
      .min(1)
      .max(1000),
    clientMutationId: clientMutationIdSchema
  })
});

export const itineraryItemIdSchema = z.object({
  params: z.object({
    itemId: uuidParam
  })
});

export type ListItineraryParams = z.infer<typeof listItinerarySchema>['params'];
export type CreateItineraryItemInput = z.infer<typeof createTripItineraryItemSchema>['body'];
export type CreateTripItineraryItemParams = z.infer<typeof createTripItineraryItemSchema>['params'];
export type CreateLegacyDayItineraryItemParams = z.infer<
  typeof createLegacyDayItineraryItemSchema
>['params'];
export type UpdateItineraryItemInput = z.infer<typeof updateItineraryItemSchema>['body'];
export type ItineraryItemIdParams = z.infer<typeof itineraryItemIdSchema>['params'];
export type ReorderItineraryItemsInput = z.infer<typeof reorderItineraryItemsSchema>['body'];
export type ReorderItineraryItemsParams = z.infer<typeof reorderItineraryItemsSchema>['params'];
