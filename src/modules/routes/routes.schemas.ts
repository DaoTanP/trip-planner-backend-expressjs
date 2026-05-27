import { z } from 'zod';

export const listTripRoutesSchema = z.object({
  params: z.object({
    tripId: z.string().uuid()
  }),
  query: z.object({
    cursor: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50)
  })
});

export type ListTripRoutesParams = z.infer<typeof listTripRoutesSchema>['params'];
export type ListTripRoutesQuery = z.infer<typeof listTripRoutesSchema>['query'];
