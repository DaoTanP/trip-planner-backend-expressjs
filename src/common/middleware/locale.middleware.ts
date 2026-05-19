import type { RequestHandler } from 'express';

import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  normalizeTimeZone,
  parseAcceptLanguage,
  resolveLocale
} from '@/common/localization/locales.js';

const getHeader = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

export const localeMiddleware: RequestHandler = (req, _res, next) => {
  const explicitLocale = getHeader(req.header('x-locale'));
  const acceptedLocale = parseAcceptLanguage(req.header('accept-language'));
  const explicitTimezone = getHeader(req.header('x-timezone')) ?? getHeader(req.header('timezone'));

  req.locale = resolveLocale([explicitLocale, acceptedLocale, DEFAULT_LOCALE]);
  req.timezone = normalizeTimeZone(explicitTimezone) ?? DEFAULT_TIMEZONE;

  next();
};
