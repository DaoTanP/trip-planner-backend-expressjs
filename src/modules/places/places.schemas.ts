import { PlaceSource } from '@prisma/client';
import { z } from 'zod';

export const listPlacesSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1).max(120).optional(),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .optional(),
    limit: z.coerce.number().int().positive().max(50).default(20)
  })
});

export const searchPlacesSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1).max(120).optional(),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    limit: z.coerce.number().int().positive().max(50).default(20)
  })
});

export const placeIdSchema = z.object({
  params: z.object({
    placeId: z.string().uuid()
  })
});

export const createPlaceSchema = z.object({
  body: z.object({
    source: z.nativeEnum(PlaceSource).default(PlaceSource.MANUAL),
    externalId: z.string().trim().max(255).optional(),
    name: z.string().trim().min(1).max(180),
    formattedAddress: z.string().trim().max(1000).optional(),
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    websiteUrl: z.string().url().optional(),
    phoneNumber: z.string().trim().max(40).optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
    categories: z.array(z.string().trim().min(1).max(80)).default([]),
    sourcePayload: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional()
  })
});

export type ListPlacesQuery = z.infer<typeof listPlacesSchema>['query'];
export type SearchPlacesQuery = z.infer<typeof searchPlacesSchema>['query'];
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>['body'];
export type PlaceIdParams = z.infer<typeof placeIdSchema>['params'];
