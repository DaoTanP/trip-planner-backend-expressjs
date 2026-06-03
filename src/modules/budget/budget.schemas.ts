import { z } from 'zod';

const uuidParam = z.string().uuid();
const clientMutationIdSchema = z.string().trim().max(120).optional();
const deviceIdSchema = z.string().trim().max(128).optional();
const revisionStringSchema = z.string().trim().regex(/^\d+$/).optional();

const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

export const tripBudgetSchema = z.object({
  params: z.object({
    tripId: uuidParam
  })
});

export const upsertTripBudgetSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  body: z.object({
    currency: currencySchema.optional(),
    totalLimit: z.number().nonnegative().nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
    expectedRevision: revisionStringSchema,
    clientMutationId: clientMutationIdSchema,
    deviceId: deviceIdSchema
  })
});

export type TripBudgetParams = z.infer<typeof tripBudgetSchema>['params'];
export type UpsertTripBudgetInput = z.infer<typeof upsertTripBudgetSchema>['body'];
