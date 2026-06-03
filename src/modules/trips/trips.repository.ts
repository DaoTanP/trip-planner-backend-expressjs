import type { Prisma, Trip } from '@prisma/client';

import {
  appendMutationEvent,
  createEntityPatchPayload,
  syncOperations
} from '@/modules/sync/mutation-event-log.js';
import { prisma } from '@/prisma/client.js';

export type TripListFilters = {
  status?: Trip['status'];
  page: number;
  limit: number;
};

export class TripsRepository {
  async findForUser(userId: string, filters: TripListFilters) {
    const where: Prisma.TripWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      OR: [
        { ownerId: userId },
        {
          collaborators: {
            some: {
              userId,
              acceptedAt: { not: null },
              deletedAt: null
            }
          }
        }
      ]
    };

    const [items, total] = await prisma.$transaction([
      prisma.trip.findMany({
        where,
        orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          _count: {
            select: {
              collaborators: {
                where: {
                  deletedAt: null
                }
              },
              itineraryItems: {
                where: {
                  deletedAt: null
                }
              },
              notes: {
                where: {
                  deletedAt: null
                }
              },
              expenses: {
                where: {
                  deletedAt: null
                }
              }
            }
          }
        }
      }),
      prisma.trip.count({ where })
    ]);

    return { items, total };
  }

  create(data: Prisma.TripUncheckedCreateInput, actorId: string): Promise<Trip> {
    return prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data
      });
      await appendMutationEvent(tx, {
        tripId: trip.id,
        actorId,
        entityType: 'TRIP',
        entityId: trip.id,
        operation: syncOperations.created,
        payload: createEntityPatchPayload({
          patchType: syncOperations.created,
          entityType: 'TRIP',
          entityId: trip.id,
          fields: {
            id: trip.id,
            revision: trip.revision.toString(),
            version: trip.version
          }
        })
      });

      return tx.trip.findUniqueOrThrow({
        where: { id: trip.id }
      });
    });
  }

  findById(id: string) {
    return prisma.trip.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        collaborators: {
          where: {
            deletedAt: null
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            collaborators: {
              where: {
                deletedAt: null
              }
            },
            itineraryItems: {
              where: {
                deletedAt: null
              }
            },
            notes: {
              where: {
                deletedAt: null
              }
            },
            expenses: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    });
  }

  findAccess(tripId: string, userId: string) {
    return prisma.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { ownerId: userId },
          {
            collaborators: {
              some: {
                userId,
                acceptedAt: { not: null },
                deletedAt: null
              }
            }
          }
        ]
      },
      select: {
        id: true,
        ownerId: true,
        collaborators: {
          where: {
            userId,
            acceptedAt: { not: null },
            deletedAt: null
          },
          select: {
            role: true
          }
        }
      }
    });
  }

  findIdentity(tripId: string) {
    return prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        ownerId: true
      }
    });
  }

  findRevision(tripId: string) {
    return prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        revision: true
      }
    });
  }

  update(
    id: string,
    data: Prisma.TripUpdateInput,
    mutation: {
      actorId: string;
      clientMutationId?: string | undefined;
      deviceId?: string | undefined;
    }
  ): Promise<Trip> {
    return prisma.$transaction(async (tx) => {
      const trip = await tx.trip.update({
        where: { id },
        data
      });
      await appendMutationEvent(tx, {
        tripId: id,
        actorId: mutation.actorId,
        deviceId: mutation.deviceId,
        clientMutationId: mutation.clientMutationId,
        entityType: 'TRIP',
        entityId: id,
        operation: syncOperations.updated,
        payload: createEntityPatchPayload({
          patchType: syncOperations.updated,
          entityType: 'TRIP',
          entityId: id,
          fields: {
            id,
            title: trip.title,
            startDate: trip.startDate?.toISOString().slice(0, 10) ?? null,
            endDate: trip.endDate?.toISOString().slice(0, 10) ?? null,
            timezone: trip.timezone,
            visibility: trip.visibility,
            status: trip.status,
            coverImageUrl: trip.coverImageUrl,
            preferences: trip.preferences as Prisma.InputJsonValue | null,
            metadata: trip.metadata as Prisma.InputJsonValue | null,
            version: trip.version,
            revision: trip.revision.toString(),
            updatedAt: trip.updatedAt.toISOString()
          }
        })
      });

      return trip;
    });
  }

  listCollaborators(tripId: string) {
    return prisma.tripCollaborator.findMany({
      where: { tripId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }]
    });
  }

  delete(id: string): Promise<Trip> {
    return prisma.trip.delete({
      where: { id }
    });
  }
}

export const tripsRepository = new TripsRepository();
