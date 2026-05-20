import { z } from 'zod';

import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from '@/common/localization/locales.js';
import { localeSchema, timezoneSchema } from '@/common/localization/schemas.js';

const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, 'validation.password.uppercase')
  .regex(/[a-z]/, 'validation.password.lowercase')
  .regex(/[0-9]/, 'validation.password.number');

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: passwordSchema,
    name: z.string().trim().min(2).max(120),
    locale: localeSchema.default(DEFAULT_LOCALE),
    timezone: timezoneSchema.default(DEFAULT_TIMEZONE)
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(1),
    deviceId: z.string().trim().max(128).optional()
  })
});

export const refreshTokenSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().min(1).optional(),
      deviceId: z.string().trim().max(128).optional()
    })
    .default({})
});

export const logoutSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().min(1).optional()
    })
    .default({})
});

export const googleOAuthLoginSchema = z.object({
  body: z.object({
    credential: z.string().min(1),
    deviceId: z.string().trim().max(128).optional(),
    locale: localeSchema.optional(),
    timezone: timezoneSchema.optional()
  })
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type LogoutInput = z.infer<typeof logoutSchema>['body'];
export type GoogleOAuthLoginInput = z.infer<typeof googleOAuthLoginSchema>['body'];
