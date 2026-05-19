export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const DEFAULT_TIMEZONE = 'UTC';

const supportedLocales = new Set<string>(SUPPORTED_LOCALES);

export const isSupportedLocale = (value: string): value is Locale => supportedLocales.has(value);

export const normalizeLocale = (value: string | null | undefined): Locale | null => {
  const normalized = value?.trim().replace('_', '-').toLowerCase();
  if (!normalized) {
    return null;
  }

  if (isSupportedLocale(normalized)) {
    return normalized;
  }

  const baseLocale = normalized.split('-')[0];
  return baseLocale && isSupportedLocale(baseLocale) ? baseLocale : null;
};

export const parseAcceptLanguage = (header: string | null | undefined): Locale | null => {
  if (!header) {
    return null;
  }

  const candidates = header
    .split(',')
    .map((part, index) => {
      const [rawLocale, ...params] = part.trim().split(';');
      if (!rawLocale) {
        return null;
      }

      const qualityParam = params.find((param) => param.trim().startsWith('q='));
      const rawQuality = qualityParam?.trim().slice(2);
      const quality = rawQuality ? Number(rawQuality) : 1;

      return {
        locale: rawLocale.trim(),
        quality: Number.isFinite(quality) ? quality : 0,
        index
      };
    })
    .filter((candidate): candidate is { locale: string; quality: number; index: number } => candidate !== null)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate.locale);
    if (locale) {
      return locale;
    }
  }

  return null;
};

export const resolveLocale = (candidates: Array<string | null | undefined>): Locale => {
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) {
      return locale;
    }
  }

  return DEFAULT_LOCALE;
};

export const normalizeTimeZone = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
};

export const isSupportedTimeZone = (value: string): boolean => normalizeTimeZone(value) !== null;
