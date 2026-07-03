import { prisma } from '@/prisma/client.js';

export type DecimalLike = number | string | { toNumber: () => number } | null | undefined;

export type PlanningSnapshotItem = {
  id: string;
  tripId: string;
  placeId: string;
  types: string[];
  summary: string | null;
  sortOrder: number;
  startsAt: Date | null;
  durationMinutes: number | null;
  status: string;
  timezone: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  place: {
    id: string;
    name: string;
    formattedAddress: string | null;
    countryCode: string | null;
    latitude: DecimalLike;
    longitude: DecimalLike;
    categories: string[];
    timezone: string | null;
  };
};

export type PlanningSnapshotExpense = {
  id: string;
  categoryId: string | null;
  itineraryItemId: string | null;
  title: string;
  amount: DecimalLike;
  currency: string;
  paidByUserId: string | null;
  spentAt: Date | null;
  createdAt: Date;
  category: {
    id: string;
    name: string;
  } | null;
};

export type PlanningTripSnapshot = {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  timezone: string;
  status: string;
  preferences: unknown;
  revision: bigint | number | string;
  itineraryItems: PlanningSnapshotItem[];
  routePreferences: Array<{
    fromItemId: string;
    toItemId: string;
    travelMode: string;
  }>;
  budget: {
    id: string;
    currency: string;
    totalLimit: DecimalLike;
  } | null;
  expenseCategories: Array<{
    id: string;
    name: string;
  }>;
  expenses: PlanningSnapshotExpense[];
  notes: Array<{
    id: string;
    authorId: string | null;
    targetEntityType: string;
    targetEntityId: string;
    createdAt: Date;
  }>;
  collaborators: Array<{
    userId: string | null;
    role: string;
    acceptedAt: Date | null;
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
    } | null;
  }>;
  mutationEvents: Array<{
    id: string;
    actorId: string | null;
    entityType: string;
    entityId: string | null;
    operation: string;
    revision: bigint | number | string;
    createdAt: Date;
    actor: {
      id: string;
      name: string;
    } | null;
  }>;
};

export class PlanningIntelligenceRepository {
  async getSnapshot(tripId: string): Promise<PlanningTripSnapshot | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- Prisma delegates are typed after prisma generate; this keeps lint usable when the generated client is unavailable.
    const snapshot = (await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        timezone: true,
        status: true,
        preferences: true,
        revision: true,
        itineraryItems: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            tripId: true,
            placeId: true,
            types: true,
            summary: true,
            sortOrder: true,
            startsAt: true,
            durationMinutes: true,
            status: true,
            timezone: true,
            version: true,
            createdAt: true,
            updatedAt: true,
            place: {
              select: {
                id: true,
                name: true,
                formattedAddress: true,
                countryCode: true,
                latitude: true,
                longitude: true,
                categories: true,
                timezone: true
              }
            }
          }
        },
        routePreferences: {
          select: {
            fromItemId: true,
            toItemId: true,
            travelMode: true
          }
        },
        budget: {
          select: {
            id: true,
            currency: true,
            totalLimit: true
          }
        },
        expenseCategories: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true
          }
        },
        expenses: {
          where: { deletedAt: null },
          orderBy: [{ spentAt: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            categoryId: true,
            itineraryItemId: true,
            title: true,
            amount: true,
            currency: true,
            paidByUserId: true,
            spentAt: true,
            createdAt: true,
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        notes: {
          where: { deletedAt: null },
          select: {
            id: true,
            authorId: true,
            targetEntityType: true,
            targetEntityId: true,
            createdAt: true
          }
        },
        collaborators: {
          where: { deletedAt: null },
          select: {
            userId: true,
            role: true,
            acceptedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        },
        mutationEvents: {
          orderBy: [{ createdAt: 'desc' }],
          take: 100,
          select: {
            id: true,
            actorId: true,
            entityType: true,
            entityId: true,
            operation: true,
            revision: true,
            createdAt: true,
            actor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })) as unknown;

    return snapshot as PlanningTripSnapshot | null;
  }
}

export const planningIntelligenceRepository = new PlanningIntelligenceRepository();
