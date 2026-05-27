import { z } from 'zod';

const uuidParam = z.string().uuid();

export const listCommentsSchema = z.object({
  params: z.object({
    tripId: uuidParam
  }),
  query: z.object({
    cursor: z.string().trim().optional(),
    limit: z.coerce.number().int().positive().max(100).default(50),
    targetEntityType: z.string().trim().max(80).optional(),
    targetEntityId: uuidParam.optional()
  })
});

export type ListCommentsParams = z.infer<typeof listCommentsSchema>['params'];
export type ListCommentsQuery = z.infer<typeof listCommentsSchema>['query'];
