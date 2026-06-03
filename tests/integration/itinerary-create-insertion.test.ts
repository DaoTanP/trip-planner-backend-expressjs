import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { createApp } from '@/app.js';
import { itineraryOrderStride } from '@/modules/itinerary/itinerary-ordering.js';
import { signAccessToken } from '@/modules/auth/auth.tokens.js';
import { prisma } from '@/prisma/client.js';

const createdTripIds: string[] = [];
const createdPlaceIds: string[] = [];
const createdUserIds: string[] = [];

type ItineraryFixture = Awaited<ReturnType<typeof createItineraryFixture>>;

const cleanupCreatedRecords = async () => {
  if (createdTripIds.length > 0) {
    await prisma.mutationEvent.deleteMany({ where: { tripId: { in: createdTripIds } } });
    await prisma.clientMutation.deleteMany({ where: { tripId: { in: createdTripIds } } });
    await prisma.itineraryItem.deleteMany({ where: { tripId: { in: createdTripIds } } });
    await prisma.trip.deleteMany({ where: { id: { in: createdTripIds } } });
    createdTripIds.length = 0;
  }

  if (createdPlaceIds.length > 0) {
    await prisma.place.deleteMany({ where: { id: { in: createdPlaceIds } } });
    createdPlaceIds.length = 0;
  }

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  }
};

const createPlace = (name: string) => {
  const id = randomUUID();
  createdPlaceIds.push(id);

  return prisma.place.create({
    data: {
      id,
      name
    }
  });
};

const createItineraryFixture = async () => {
  const userId = randomUUID();
  const tripId = randomUUID();
  createdUserIds.push(userId);
  createdTripIds.push(tripId);

  const user = await prisma.user.create({
    data: {
      id: userId,
      email: `traveler-${userId}@example.com`,
      name: 'Test Traveler',
      role: 'USER'
    }
  });
  const trip = await prisma.trip.create({
    data: {
      id: tripId,
      ownerId: user.id,
      title: 'Insertion Trip'
    }
  });
  const [firstPlace, secondPlace, insertedPlace] = await Promise.all([
    createPlace('First Stop'),
    createPlace('Second Stop'),
    createPlace('Inserted Stop')
  ]);
  const firstItem = await prisma.itineraryItem.create({
    data: {
      tripId: trip.id,
      placeId: firstPlace.id,
      types: ['ACTIVITY'],
      sortOrder: itineraryOrderStride
    }
  });
  const secondItem = await prisma.itineraryItem.create({
    data: {
      tripId: trip.id,
      placeId: secondPlace.id,
      types: ['ACTIVITY'],
      sortOrder: itineraryOrderStride * 2
    }
  });

  return {
    trip,
    firstItem,
    secondItem,
    insertedPlace,
    authHeader: `Bearer ${signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })}`
  };
};

const listItemIdsInOrder = async (tripId: string): Promise<string[]> => {
  const items = await prisma.itineraryItem.findMany({
    where: {
      tripId,
      deletedAt: null
    },
    orderBy: [
      {
        sortOrder: 'asc'
      },
      {
        id: 'asc'
      }
    ],
    select: {
      id: true
    }
  });

  return items.map((item) => item.id);
};

const postItineraryItem = (fixture: ItineraryFixture, body: Record<string, unknown>) =>
  request(createApp())
    .post(`/api/v1/trips/${fixture.trip.id}/itinerary`)
    .set('Authorization', fixture.authHeader)
    .send({
      placeId: fixture.insertedPlace.id,
      ...body
    });

describe('create itinerary item insertion', () => {
  afterEach(async () => {
    await cleanupCreatedRecords();
  });

  it('inserts a new item before a target item', async () => {
    const fixture = await createItineraryFixture();

    const response = await postItineraryItem(fixture, {
      beforeItemId: fixture.secondItem.id
    }).expect(201);

    const insertedItemId = response.body.data.item.id as string;
    await expect(listItemIdsInOrder(fixture.trip.id)).resolves.toEqual([
      fixture.firstItem.id,
      insertedItemId,
      fixture.secondItem.id
    ]);
  });

  it('inserts a new item after a target item', async () => {
    const fixture = await createItineraryFixture();

    const response = await postItineraryItem(fixture, {
      afterItemId: fixture.firstItem.id
    }).expect(201);

    const insertedItemId = response.body.data.item.id as string;
    await expect(listItemIdsInOrder(fixture.trip.id)).resolves.toEqual([
      fixture.firstItem.id,
      insertedItemId,
      fixture.secondItem.id
    ]);
  });

  it('inserts a new item between valid after and before items', async () => {
    const fixture = await createItineraryFixture();

    const response = await postItineraryItem(fixture, {
      afterItemId: fixture.firstItem.id,
      beforeItemId: fixture.secondItem.id
    }).expect(201);

    const insertedItemId = response.body.data.item.id as string;
    await expect(listItemIdsInOrder(fixture.trip.id)).resolves.toEqual([
      fixture.firstItem.id,
      insertedItemId,
      fixture.secondItem.id
    ]);
  });

  it('rejects invalid before and after combinations', async () => {
    const fixture = await createItineraryFixture();

    const response = await postItineraryItem(fixture, {
      afterItemId: fixture.secondItem.id,
      beforeItemId: fixture.firstItem.id
    }).expect(409);

    expect(response.body.error).toMatchObject({
      code: 'CONFLICT',
      message: 'Itinerary insertion position is invalid'
    });
    await expect(listItemIdsInOrder(fixture.trip.id)).resolves.toEqual([
      fixture.firstItem.id,
      fixture.secondItem.id
    ]);
  });
});
