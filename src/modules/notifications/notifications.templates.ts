import type { NotificationType } from '@prisma/client';

import type { Locale } from '@/common/localization/locales.js';
import { DEFAULT_TIMEZONE, normalizeTimeZone } from '@/common/localization/locales.js';
import type { MessageKey } from '@/common/localization/messages.js';
import { translate, type MessageParams } from '@/common/localization/translator.js';
import { formatDateTimeForLocale } from '@/common/utils/date.js';

export type NotificationTemplateParams = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

export type NotificationTemplateData = {
  template: NotificationType;
  locale: Locale;
  timezone: string;
  params: Record<string, string | number | boolean | null>;
};

export type RenderedNotificationTemplate = {
  title: string;
  body: string | null;
  data: NotificationTemplateData;
};

export type RenderedNotificationEmailTemplate = {
  subject: string;
  text: string;
  html: string;
  locale: Locale;
  timezone: string;
};

type NotificationTemplateDefinition = {
  titleKey: MessageKey;
  bodyKey: MessageKey;
  emailSubjectKey: MessageKey;
  emailTextKey: MessageKey;
  emailHtmlKey: MessageKey;
};

const notificationTemplates = {
  TRIP_INVITE: {
    titleKey: 'notifications.TRIP_INVITE.title',
    bodyKey: 'notifications.TRIP_INVITE.body',
    emailSubjectKey: 'emails.TRIP_INVITE.subject',
    emailTextKey: 'emails.TRIP_INVITE.text',
    emailHtmlKey: 'emails.TRIP_INVITE.html'
  },
  COMMENT_MENTION: {
    titleKey: 'notifications.COMMENT_MENTION.title',
    bodyKey: 'notifications.COMMENT_MENTION.body',
    emailSubjectKey: 'emails.COMMENT_MENTION.subject',
    emailTextKey: 'emails.COMMENT_MENTION.text',
    emailHtmlKey: 'emails.COMMENT_MENTION.html'
  },
  ITINERARY_UPDATE: {
    titleKey: 'notifications.ITINERARY_UPDATE.title',
    bodyKey: 'notifications.ITINERARY_UPDATE.body',
    emailSubjectKey: 'emails.ITINERARY_UPDATE.subject',
    emailTextKey: 'emails.ITINERARY_UPDATE.text',
    emailHtmlKey: 'emails.ITINERARY_UPDATE.html'
  },
  SYSTEM: {
    titleKey: 'notifications.SYSTEM.title',
    bodyKey: 'notifications.SYSTEM.body',
    emailSubjectKey: 'emails.SYSTEM.subject',
    emailTextKey: 'emails.SYSTEM.text',
    emailHtmlKey: 'emails.SYSTEM.html'
  }
} satisfies Record<NotificationType, NotificationTemplateDefinition>;

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildTemplateParams = (
  params: NotificationTemplateParams | undefined,
  locale: Locale,
  timezone: string
): MessageParams => {
  const normalizedParams: MessageParams = {};

  for (const [key, value] of Object.entries(params ?? {})) {
    normalizedParams[key] = value instanceof Date ? formatDateTimeForLocale(value, { locale, timezone }) : value;
  }

  return normalizedParams;
};

const serializeTemplateParams = (
  params: NotificationTemplateParams | undefined
): NotificationTemplateData['params'] => {
  const serialized: NotificationTemplateData['params'] = {};

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined) {
      continue;
    }

    serialized[key] = value instanceof Date ? value.toISOString() : value;
  }

  return serialized;
};

const escapeTemplateParams = (params: MessageParams): MessageParams => {
  const escaped: MessageParams = {};

  for (const [key, value] of Object.entries(params)) {
    escaped[key] = typeof value === 'string' ? escapeHtml(value) : value;
  }

  return escaped;
};

export const renderNotificationTemplate = (
  type: NotificationType,
  options: {
    locale: Locale;
    timezone?: string;
    params?: NotificationTemplateParams;
  }
): RenderedNotificationTemplate => {
  const template = notificationTemplates[type];
  const timezone = normalizeTimeZone(options.timezone) ?? DEFAULT_TIMEZONE;
  const params = buildTemplateParams(options.params, options.locale, timezone);

  return {
    title: translate(template.titleKey, { locale: options.locale, params }),
    body: translate(template.bodyKey, { locale: options.locale, params }),
    data: {
      template: type,
      locale: options.locale,
      timezone,
      params: serializeTemplateParams(options.params)
    }
  };
};

export const renderNotificationEmailTemplate = (
  type: NotificationType,
  options: {
    locale: Locale;
    timezone?: string;
    params?: NotificationTemplateParams;
  }
): RenderedNotificationEmailTemplate => {
  const template = notificationTemplates[type];
  const timezone = normalizeTimeZone(options.timezone) ?? DEFAULT_TIMEZONE;
  const params = buildTemplateParams(options.params, options.locale, timezone);

  return {
    subject: translate(template.emailSubjectKey, { locale: options.locale, params }),
    text: translate(template.emailTextKey, { locale: options.locale, params }),
    html: translate(template.emailHtmlKey, {
      locale: options.locale,
      params: escapeTemplateParams(params)
    }),
    locale: options.locale,
    timezone
  };
};
