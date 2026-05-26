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
              itineraryItems: {
                where: {
                  deletedAt: null
                }
              },
              notes: true,
              routeSegments: true
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
        _count: {
          select: {
            collaborators: true,
            itineraryItems: {
              where: {
                deletedAt: null
              }
            },
            notes: true,
            routeSegments: true
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

  listNotes(tripId: string) {
    return prisma.tripNote.findMany({
      where: { tripId },
      orderBy: [{ pinned: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }]
    });
  }

  listCollaborators(tripId: string) {
    return prisma.tripCollaborator.findMany({
      where: { tripId },
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

  getExpenses(tripId: string) {
    return prisma.$transaction(async (tx) => {
      const [budget, categories, expenses] = await Promise.all([
        tx.budget.findUnique({
          where: { tripId }
        }),
        tx.expenseCategory.findMany({
          where: { tripId },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
        }),
        tx.expense.findMany({
          where: {
            tripId,
            deletedAt: null
          },
          orderBy: [{ spentAt: 'asc' }, { createdAt: 'asc' }]
        })
      ]);

      return { budget, categories, expenses };
    });
  }

  findNoteTripId(noteId: string): Promise<{ tripId: string; version: number } | null> {
    return prisma.tripNote.findUnique({
      where: { id: noteId },
      select: { tripId: true, version: true }
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
