import { z } from 'zod';

const uuidParam = z.string().uuid();
const revisionStringSchema = z.string().trim().regex(/^\d+$/);

export const listMutationEventsSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  query: z.object({
    afterRevision: revisionStringSchema.optional(),
    sinceRevision: revisionStringSchema.optional(),
    cursor: revisionStringSchema.optional(),
    limit: z.coerce.number().int().positive().max(500).default(100)
  })
});

export type ListMutationEventsParams = z.infer<typeof listMutationEventsSchema>['params'];
export type ListMutationEventsQuery = z.infer<typeof listMutationEventsSchema>['query'];
