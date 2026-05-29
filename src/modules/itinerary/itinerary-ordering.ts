import type { Prisma } from '@prisma/client';

export const itineraryOrderStride = 65_536;

export const itineraryItemOrderBy = [
  { sortOrder: 'asc' },
  { id: 'asc' }
] satisfies Prisma.ItineraryItemOrderByWithRelationInput[];

export const spacedItineraryOrder = (index: number): number => (index + 1) * itineraryOrderStride;

export const getMidpointSortOrder = (lower: number, upper: number): number | null =>
  upper - lower > 1 ? lower + Math.floor((upper - lower) / 2) : null;
