import type { Prisma, Trip } from '@prisma/client';

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
              acceptedAt: { not: null }
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
          destinations: {
            orderBy: { order: 'asc' }
          },
          _count: {
            select: {
              collaborators: true,
              days: true
            }
          }
        }
      }),
      prisma.trip.count({ where })
    ]);

    return { items, total };
  }

  create(data: Prisma.TripUncheckedCreateInput): Promise<Trip> {
    return prisma.trip.create({
      data
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
        destinations: {
          orderBy: { order: 'asc' }
        },
        collaborators: {
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
        days: {
          orderBy: { order: 'asc' },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: {
                place: true
              }
            }
          }
        },
        notes: {
          orderBy: [{ pinned: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }]
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
                acceptedAt: { not: null }
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
            acceptedAt: { not: null }
          },
          select: {
            role: true
          }
        }
      }
    });
  }

  update(id: string, data: Prisma.TripUpdateInput): Promise<Trip> {
    return prisma.trip.update({
      where: { id },
      data
    });
  }

  createNote(data: Prisma.TripNoteUncheckedCreateInput) {
    return prisma.tripNote.create({
      data
    });
  }

  findNoteTripId(noteId: string): Promise<{ tripId: string } | null> {
    return prisma.tripNote.findUnique({
      where: { id: noteId },
      select: { tripId: true }
    });
  }

  updateNote(id: string, data: Prisma.TripNoteUpdateInput) {
    return prisma.tripNote.update({
      where: { id },
      data
    });
  }

  deleteNote(id: string) {
    return prisma.tripNote.delete({
      where: { id }
    });
  }

  delete(id: string): Promise<Trip> {
    return prisma.trip.delete({
      where: { id }
    });
  }
}

export const tripsRepository = new TripsRepository();
