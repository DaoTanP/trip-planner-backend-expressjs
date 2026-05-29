import type { CursorPaginationMeta } from '@/api/contracts/index.js';

export type CursorPage<TItem> = {
  items: TItem[];
  pagination: CursorPaginationMeta;
};

export const defaultCursorLimit = 50;
export const maxCursorLimit = 100;
const cursorVersion = 1;

export const normalizeCursorLimit = (limit: number | undefined): number =>
  Math.min(Math.max(limit ?? defaultCursorLimit, 1), maxCursorLimit);

type CursorEnvelope<TCursor> = {
  v: typeof cursorVersion;
  k: TCursor;
};

export const encodeCursor = (value: Record<string, string | number>): string =>
  Buffer.from(
    JSON.stringify({ v: cursorVersion, k: value } satisfies CursorEnvelope<typeof value>)
  ).toString('base64url');

export const decodeCursor = <TCursor extends Record<string, unknown>>(
  cursor: string | undefined
): TCursor | null => {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as
      | CursorEnvelope<TCursor>
      | TCursor;

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'v' in parsed &&
      'k' in parsed &&
      parsed.v === cursorVersion
    ) {
      return (parsed as CursorEnvelope<TCursor>).k;
    }

    return parsed as TCursor;
  } catch {
    return null;
  }
};

export const buildCursorPage = <TItem>(
  items: TItem[],
  limit: number,
  getCursor: (item: TItem) => string
): CursorPage<TItem> => {
  const pageItems = items.slice(0, limit);
  const lastItem = pageItems.at(-1);

  return {
    items: pageItems,
    pagination: {
      limit,
      cursorVersion,
      nextCursor: items.length > limit && lastItem ? getCursor(lastItem) : null,
      hasNextPage: items.length > limit
    }
  };
};
