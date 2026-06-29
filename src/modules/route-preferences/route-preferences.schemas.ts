import { z } from 'zod';

const uuidParam = z.string().uuid();
const clientMutationIdSchema = z.string().trim().max(120).optional();
const deviceIdSchema = z.string().trim().max(128).optional();
const revisionStringSchema = z.string().trim().regex(/^\d+$/).optional();

export const routeTravelModes = ['driving', 'walking', 'bicycling', 'transit'] as const;

export const listTripRoutePreferencesSchema = z.object({
  params: z.object({
    tripId: uuidParam
  })
});

export const upsertTripRoutePreferenceSchema = z
  .object({
    params: z.object({
      tripId: uuidParam,
      fromItemId: uuidParam,
      toItemId: uuidParam
    }),
    body: z.object({
      travelMode: z.enum(routeTravelModes),
      expectedRevision: revisionStringSchema,
      clientMutationId: clientMutationIdSchema,
      deviceId: deviceIdSchema
    })
  })
  .refine((value) => value.params.fromItemId !== value.params.toItemId, {
    message: 'validation.routePreference.sameEndpoint',
    path: ['params', 'toItemId']
  });

export type ListTripRoutePreferencesParams = z.infer<
  typeof listTripRoutePreferencesSchema
>['params'];
export type UpsertTripRoutePreferenceParams = z.infer<
  typeof upsertTripRoutePreferenceSchema
>['params'];
export type UpsertTripRoutePreferenceInput = z.infer<
  typeof upsertTripRoutePreferenceSchema
>['body'];
