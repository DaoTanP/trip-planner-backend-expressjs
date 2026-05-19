import type { Locale } from '@/common/localization/locales.js';
import { DEFAULT_TIMEZONE, normalizeTimeZone } from '@/common/localization/locales.js';

export const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

export const parseDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

export const formatDateTimeForLocale = (
  date: Date,
  options: {
    locale: Locale;
    timezone: string;
    dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
    timeStyle?: Intl.DateTimeFormatOptions['timeStyle'];
  }
): string => {
  const timezone = normalizeTimeZone(options.timezone) ?? DEFAULT_TIMEZONE;

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: options.dateStyle ?? 'medium',
    timeStyle: options.timeStyle ?? 'short',
    timeZone: timezone
  }).format(date);
};
