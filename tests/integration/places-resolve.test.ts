import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { createApp } from '@/app.js';
import { signAccessToken } from '@/modules/auth/auth.tokens.js';
import { prisma } from '@/prisma/client.js';

const createdPlaceIds: string[] = [];

type ResolvePlaceResponseBody = {
  success: true;
  data: {
    created: boolean;
    place: {
      id: string;
    };
  };
};

type ErrorResponseBody = {
  error: {
    code: string;
  };
};

const authToken = signAccessToken({
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'traveler@example.com',
  role: 'USER'
});

const trackPlace = (placeId: string) => {
  if (!createdPlaceIds.includes(placeId)) {
    createdPlaceIds.push(placeId);
  }
};

const cleanupCreatedPlaces = async () => {
  if (createdPlaceIds.length === 0) {
    return;
  }

  await prisma.place.deleteMany({
    where: {
      id: {
        in: createdPlaceIds
      }
    }
  });
  createdPlaceIds.length = 0;
};

const resolvePlace = (body: Record<string, unknown>) =>
  request(createApp())
    .post('/api/v1/places/resolve')
    .set('Authorization', `Bearer ${authToken}`)
    .send(body);

describe('places resolve endpoint', () => {
  afterEach(async () => {
    await cleanupCreatedPlaces();
  });

  it('returns an existing place when providerPlaceId matches', async () => {
    const providerPlaceId = `osm-existing-${randomUUID()}`;
    const existing = await prisma.place.create({
      data: {
        provider: 'OSM',
        providerPlaceId,
        name: 'Existing Place',
        formattedAddress: 'Existing Place, Hanoi, Vietnam',
        countryCode: 'VN',
        latitude: 21.028511,
        longitude: 105.854444
      }
    });
    trackPlace(existing.id);

    const response = await resolvePlace({
      provider: 'OSM',
      providerPlaceId,
      name: 'Provider Result Name',
      formattedAddress: 'Provider Result Address'
    }).expect(200);
    const body = response.body as ResolvePlaceResponseBody;

    expect(body).toMatchObject({
      success: true,
      data: {
        created: false,
        place: {
          id: existing.id,
          provider: 'OSM',
          providerPlaceId,
          name: 'Existing Place'
        }
      }
    });
  });

  it('creates a new place when providerPlaceId is not found', async () => {
    const providerPlaceId = `osm-new-${randomUUID()}`;

    const response = await resolvePlace({
      provider: 'OSM',
      providerPlaceId,
      name: 'New Resolve Place',
      formattedAddress: 'New Resolve Place, Hanoi, Vietnam',
      countryCode: 'vn',
      latitude: 21.028511,
      longitude: 105.854444,
      categories: ['tourism']
    }).expect(200);
    const body = response.body as ResolvePlaceResponseBody;

    trackPlace(body.data.place.id);
    expect(body).toMatchObject({
      success: true,
      data: {
        created: true,
        place: {
          provider: 'OSM',
          providerPlaceId,
          name: 'New Resolve Place',
          countryCode: 'VN',
          latitude: 21.028511,
          longitude: 105.854444,
          categories: ['tourism']
        }
      }
    });

    await expect(
      prisma.place.count({
        where: {
          provider: 'OSM',
          providerPlaceId
        }
      })
    ).resolves.toBe(1);
  });

  it('uses deterministic fallback matching when providerPlaceId is missing', async () => {
    const existing = await prisma.place.create({
      data: {
        provider: 'OSM',
        name: 'Hoan Kiem Lake',
        formattedAddress: 'Hoan Kiem Lake, Hanoi, Vietnam',
        countryCode: 'VN',
        latitude: 21.028511,
        longitude: 105.854444
      }
    });
    trackPlace(existing.id);

    const response = await resolvePlace({
      provider: 'OSM',
      name: 'hoan kiem lake',
      formattedAddress: 'Hoan Kiem Lake, Hanoi, Vietnam',
      countryCode: 'vn',
      latitude: 21.028511,
      longitude: 105.854444
    }).expect(200);
    const body = response.body as ResolvePlaceResponseBody;

    expect(body).toMatchObject({
      success: true,
      data: {
        created: false,
        place: {
          id: existing.id,
          name: 'Hoan Kiem Lake'
        }
      }
    });
  });

  it('does not create duplicate places for concurrent providerPlaceId resolves', async () => {
    const providerPlaceId = `osm-concurrent-${randomUUID()}`;
    const app = createApp();

    const responses = await Promise.all([
      request(app)
        .post('/api/v1/places/resolve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'OSM',
          providerPlaceId,
          name: 'Concurrent Resolve Place'
        })
        .expect(200),
      request(app)
        .post('/api/v1/places/resolve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'OSM',
          providerPlaceId,
          name: 'Concurrent Resolve Place'
        })
        .expect(200)
    ]);

    const placeIds = new Set<string>();
    const bodies = responses.map((response) => response.body as ResolvePlaceResponseBody);
    const createdFlags = bodies.map((body) => body.data.created);
    for (const body of bodies) {
      const placeId = body.data.place.id;
      placeIds.add(placeId);
      trackPlace(placeId);
    }

    expect(placeIds.size).toBe(1);
    expect(createdFlags.filter(Boolean)).toHaveLength(1);
    await expect(
      prisma.place.count({
        where: {
          provider: 'OSM',
          providerPlaceId
        }
      })
    ).resolves.toBe(1);
  });

  it('returns validation errors for invalid payloads', async () => {
    const response = await resolvePlace({
      provider: 'OSM',
      providerPlaceId: '',
      latitude: 91
    }).expect(422);
    const body = response.body as ErrorResponseBody;

    expect(body.error).toMatchObject({
      code: 'VALIDATION_ERROR'
    });
  });
});
