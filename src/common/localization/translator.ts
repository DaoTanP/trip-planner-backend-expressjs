import { DEFAULT_LOCALE, type Locale } from '@/common/localization/locales.js';
import { LOCALIZED_MESSAGES, type MessageKey } from '@/common/localization/messages.js';

export interface NestedMessageParam {
  messageKey: MessageKey;
  params?: MessageParams;
}

export type MessageParamValue = string | number | boolean | Date | null | undefined | NestedMessageParam;
export type MessageParams = Record<string, MessageParamValue>;

const isNestedMessageParam = (value: MessageParamValue): value is NestedMessageParam =>
  typeof value === 'object' && value !== null && !(value instanceof Date) && 'messageKey' in value;

const formatParam = (value: MessageParamValue, locale: Locale): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isNestedMessageParam(value)) {
    return value.params
      ? translate(value.messageKey, { locale, params: value.params })
      : translate(value.messageKey, { locale });
  }

  return String(value);
};

export const translate = (
  key: MessageKey,
  options: { locale?: Locale; params?: MessageParams } = {}
): string => {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const template = LOCALIZED_MESSAGES[locale][key] ?? LOCALIZED_MESSAGES[DEFAULT_LOCALE][key];

  return Object.entries(options.params ?? {}).reduce(
    (message, [paramKey, paramValue]) =>
      message.replaceAll(`{${paramKey}}`, formatParam(paramValue, locale)),
    template
  );
};
