import { ItineraryItemStatus, ItineraryItemType } from '@prisma/client';
import { z } from 'zod';

import { DEFAULT_TIMEZONE } from '@/common/localization/locales.js';
import { timezoneSchema } from '@/common/localization/schemas.js';

const uuidParam = z.string().uuid();
const dateTimeSchema = z.string().datetime();
const clientMutationIdSchema = z.string().trim().max(120).optional();
const deviceIdSchema = z.string().trim().max(128).optional();
const revisionStringSchema = z.string().trim().regex(/^\d+$/).optional();

const itineraryItemPayloadShape = {
  placeId: uuidParam.optional(),
  types: z.array(z.nativeEnum(ItineraryItemType)).min(1).optional(),
  summary: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  startsAt: dateTimeSchema.nullable().optional(),
  durationMinutes: z.number().int().nonnegative().nullable().optional(),
  status: z.nativeEnum(ItineraryItemStatus).optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  timezone: timezoneSchema.optional(),
  expectedVersion: z.number().int().positive().optional(),
  expectedRevision: revisionStringSchema,
  clientMutationId: clientMutationIdSchema,
  deviceId: deviceIdSchema
} as const;

const itineraryItemPayloadSchema = z.object(itineraryItemPayloadShape);

export const listItinerarySchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  query: z.object({
    cursor: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50)
  })
});

export const createTripItineraryItemSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  body: z
    .object({
      placeId: uuidParam,
      beforeItemId: uuidParam.nullable().optional(),
      afterItemId: uuidParam.nullable().optional(),
      types: z.array(z.nativeEnum(ItineraryItemType)).min(1).default([ItineraryItemType.ACTIVITY]),
      summary: z.string().trim().max(500).nullable().optional(),
      sortOrder: z.number().int().min(0).optional(),
      startsAt: dateTimeSchema.nullable().optional(),
      durationMinutes: z.number().int().nonnegative().nullable().optional(),
      status: z.nativeEnum(ItineraryItemStatus).default(ItineraryItemStatus.PLANNED),
      metadata: z.record(z.unknown()).nullable().optional(),
      timezone: timezoneSchema.default(DEFAULT_TIMEZONE),
      expectedRevision: revisionStringSchema,
      clientMutationId: clientMutationIdSchema,
      deviceId: deviceIdSchema
    })
    .refine(
      (value) =>
        !value.beforeItemId || !value.afterItemId || value.beforeItemId !== value.afterItemId,
      {
        message: 'validation.itinerary.sameNeighbor',
        path: ['beforeItemId']
      }
    )
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
  body: z
    .object({
      itemId: uuidParam,
      beforeItemId: uuidParam.nullable().optional(),
      afterItemId: uuidParam.nullable().optional(),
      expectedVersion: z.number().int().positive().optional(),
      expectedRevision: revisionStringSchema,
      clientMutationId: clientMutationIdSchema,
      deviceId: deviceIdSchema
    })
    .refine((value) => value.itemId !== value.beforeItemId, {
      message: 'validation.itinerary.reorderSelfReference',
      path: ['beforeItemId']
    })
    .refine((value) => value.itemId !== value.afterItemId, {
      message: 'validation.itinerary.reorderSelfReference',
      path: ['afterItemId']
    })
});

export const itineraryItemIdSchema = z.object({
  params: z.object({
    itemId: uuidParam
  })
});

export const deleteItineraryItemSchema = z.object({
  params: z.object({
    itemId: uuidParam
  }),
  query: z.object({
    expectedRevision: revisionStringSchema,
    clientMutationId: clientMutationIdSchema,
    deviceId: deviceIdSchema
  })
});

export type ListItineraryParams = z.infer<typeof listItinerarySchema>['params'];
export type ListItineraryQuery = z.infer<typeof listItinerarySchema>['query'];
export type CreateItineraryItemInput = z.infer<typeof createTripItineraryItemSchema>['body'];
export type CreateTripItineraryItemParams = z.infer<typeof createTripItineraryItemSchema>['params'];
export type UpdateItineraryItemInput = z.infer<typeof updateItineraryItemSchema>['body'];
export type ItineraryItemIdParams = z.infer<typeof itineraryItemIdSchema>['params'];
export type DeleteItineraryItemQuery = z.infer<typeof deleteItineraryItemSchema>['query'];
export type ReorderItineraryItemsInput = z.infer<typeof reorderItineraryItemsSchema>['body'];
export type ReorderItineraryItemsParams = z.infer<typeof reorderItineraryItemsSchema>['params'];
