import { z } from 'zod';

export const listTripRoutesSchema = z.object({
  params: z.object({
    tripId: z.string().uuid()
  })
});

export type ListTripRoutesParams = z.infer<typeof listTripRoutesSchema>['params'];
