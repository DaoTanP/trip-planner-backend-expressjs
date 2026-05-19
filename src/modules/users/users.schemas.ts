import { z } from 'zod';

import { localeSchema, timezoneSchema } from '@/common/localization/schemas.js';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    locale: localeSchema.optional(),
    timezone: timezoneSchema.optional(),
    preferences: z.record(z.unknown()).optional()
  })
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
