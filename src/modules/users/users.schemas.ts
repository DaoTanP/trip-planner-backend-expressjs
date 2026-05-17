import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    preferences: z.record(z.unknown()).optional()
  })
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
