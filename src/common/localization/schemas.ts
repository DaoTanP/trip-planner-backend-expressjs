import { z } from 'zod';

import { normalizeLocale, normalizeTimeZone, type Locale } from '@/common/localization/locales.js';

export const dateOnlyStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'validation.dateOnly' });

export const localeSchema = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .transform((value, ctx): Locale => {
    const locale = normalizeLocale(value);
    if (!locale) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.locale.unsupported',
        params: { messageKey: 'validation.locale.unsupported' }
      });
      return z.NEVER;
    }

    return locale;
  });

export const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform((value, ctx): string => {
    const timezone = normalizeTimeZone(value);
    if (!timezone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validation.timezone.invalid',
        params: { messageKey: 'validation.timezone.invalid' }
      });
      return z.NEVER;
    }

    return timezone;
  });
