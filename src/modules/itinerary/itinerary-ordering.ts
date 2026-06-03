import type { Prisma } from '@prisma/client';

export const itineraryOrderStride = 65_536;

export const itineraryItemOrderBy = [
  { sortOrder: 'asc' },
  { id: 'asc' }
] satisfies Prisma.ItineraryItemOrderByWithRelationInput[];

export const spacedItineraryOrder = (index: number): number => (index + 1) * itineraryOrderStride;

export const getMidpointSortOrder = (lower: number, upper: number): number | null =>
  upper - lower > 1 ? lower + Math.floor((upper - lower) / 2) : null;

export type ItineraryOrderKey = {
  id: string;
  sortOrder: number;
};

export const compareItineraryOrder = (left: ItineraryOrderKey, right: ItineraryOrderKey): number =>
  left.sortOrder === right.sortOrder
    ? left.id.localeCompare(right.id)
    : left.sortOrder - right.sortOrder;

export const isBeforeInItineraryOrder = (
  left: ItineraryOrderKey,
  right: ItineraryOrderKey
): boolean => compareItineraryOrder(left, right) < 0;
