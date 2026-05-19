import { ZodIssueCode, type ZodIssue } from 'zod';

import type { Locale } from '@/common/localization/locales.js';
import { isMessageKey, type MessageKey } from '@/common/localization/messages.js';
import { translate, type MessageParams } from '@/common/localization/translator.js';

export type LocalizedValidationIssue = {
  path: string;
  message: string;
  code: string;
  messageKey: MessageKey;
  params?: MessageParams;
};

type ResolvedIssueMessage = {
  key: MessageKey;
  params?: MessageParams;
};

const directMessageKey = (issue: ZodIssue): MessageKey | null =>
  isMessageKey(issue.message) ? issue.message : null;

const customMessageKey = (issue: ZodIssue): MessageKey | null => {
  if (issue.code !== ZodIssueCode.custom) {
    return null;
  }

  const messageKey = issue.params?.messageKey;
  return typeof messageKey === 'string' && isMessageKey(messageKey) ? messageKey : null;
};

const resolveInvalidStringMessage = (issue: Extract<ZodIssue, { code: typeof ZodIssueCode.invalid_string }>) => {
  const validation = issue.validation;

  if (validation === 'email') return { key: 'validation.invalidEmail' } satisfies ResolvedIssueMessage;
  if (validation === 'url') return { key: 'validation.invalidUrl' } satisfies ResolvedIssueMessage;
  if (validation === 'uuid') return { key: 'validation.invalidUuid' } satisfies ResolvedIssueMessage;
  if (validation === 'datetime') return { key: 'validation.invalidDatetime' } satisfies ResolvedIssueMessage;
  if (validation === 'regex') return { key: 'validation.regex' } satisfies ResolvedIssueMessage;

  return { key: 'validation.invalidString' } satisfies ResolvedIssueMessage;
};

const resolveTooSmallMessage = (issue: Extract<ZodIssue, { code: typeof ZodIssueCode.too_small }>) => {
  const params = { minimum: String(issue.minimum) };

  if (issue.type === 'string') return { key: 'validation.tooSmall.string', params } satisfies ResolvedIssueMessage;
  if (issue.type === 'array' || issue.type === 'set') {
    return { key: 'validation.tooSmall.array', params } satisfies ResolvedIssueMessage;
  }
  if (issue.type === 'date') return { key: 'validation.tooSmall.date', params } satisfies ResolvedIssueMessage;

  return { key: 'validation.tooSmall.number', params } satisfies ResolvedIssueMessage;
};

const resolveTooBigMessage = (issue: Extract<ZodIssue, { code: typeof ZodIssueCode.too_big }>) => {
  const params = { maximum: String(issue.maximum) };

  if (issue.type === 'string') return { key: 'validation.tooBig.string', params } satisfies ResolvedIssueMessage;
  if (issue.type === 'array' || issue.type === 'set') {
    return { key: 'validation.tooBig.array', params } satisfies ResolvedIssueMessage;
  }
  if (issue.type === 'date') return { key: 'validation.tooBig.date', params } satisfies ResolvedIssueMessage;

  return { key: 'validation.tooBig.number', params } satisfies ResolvedIssueMessage;
};

const resolveIssueMessage = (issue: ZodIssue): ResolvedIssueMessage => {
  const explicitKey = customMessageKey(issue) ?? directMessageKey(issue);
  if (explicitKey) {
    return { key: explicitKey };
  }

  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === 'undefined') {
        return { key: 'validation.required' };
      }
      return {
        key: 'validation.invalidType',
        params: {
          expected: issue.expected,
          received: issue.received
        }
      };
    case ZodIssueCode.invalid_literal:
      return {
        key: 'validation.invalidLiteral',
        params: { expected: String(issue.expected) }
      };
    case ZodIssueCode.unrecognized_keys:
      return {
        key: 'validation.unrecognizedKeys',
        params: { keys: issue.keys.join(', ') }
      };
    case ZodIssueCode.invalid_union:
    case ZodIssueCode.invalid_union_discriminator:
    case ZodIssueCode.invalid_arguments:
    case ZodIssueCode.invalid_return_type:
    case ZodIssueCode.invalid_intersection_types:
      return { key: 'validation.invalidUnion' };
    case ZodIssueCode.invalid_enum_value:
      return {
        key: 'validation.invalidEnum',
        params: { options: issue.options.join(', ') }
      };
    case ZodIssueCode.invalid_date:
      return { key: 'validation.invalidDate' };
    case ZodIssueCode.invalid_string:
      return resolveInvalidStringMessage(issue);
    case ZodIssueCode.too_small:
      return resolveTooSmallMessage(issue);
    case ZodIssueCode.too_big:
      return resolveTooBigMessage(issue);
    case ZodIssueCode.not_multiple_of:
      return {
        key: 'validation.notMultipleOf',
        params: { multipleOf: String(issue.multipleOf) }
      };
    case ZodIssueCode.not_finite:
      return { key: 'validation.notFinite' };
    case ZodIssueCode.custom:
      return { key: 'validation.custom.invalid' };
  }
};

export const formatZodIssues = (issues: ZodIssue[], locale: Locale): LocalizedValidationIssue[] =>
  issues.map((issue) => {
    const resolved = resolveIssueMessage(issue);
    const detail: LocalizedValidationIssue = {
      path: issue.path.join('.'),
      message: resolved.params
        ? translate(resolved.key, { locale, params: resolved.params })
        : translate(resolved.key, { locale }),
      code: issue.code,
      messageKey: resolved.key
    };

    if (resolved.params) {
      detail.params = resolved.params;
    }

    return detail;
  });
