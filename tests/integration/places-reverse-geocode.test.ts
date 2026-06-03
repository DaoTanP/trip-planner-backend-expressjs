import request from 'supertest';

import { createApp } from '@/app.js';
import { signAccessToken } from '@/modules/auth/auth.tokens.js';

const authToken = signAccessToken({
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'traveler@example.com',
  role: 'USER'
});

describe('places reverse geocode endpoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns normalized place information from the configured provider', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          place_id: 12345,
          osm_type: 'node',
          osm_id: 67890,
          display_name: 'Hoan Kiem Lake, Hanoi, Vietnam',
          lat: '21.028511',
          lon: '105.854444',
          address: {
            tourism: 'Hoan Kiem Lake',
            city: 'Hanoi',
            country_code: 'vn'
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await request(createApp())
      .get('/api/v1/places/reverse-geocode')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ lat: 21.028511, lng: 105.854444 })
      .expect(200);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.body).toMatchObject({
      success: true,
      data: {
        place: {
          name: 'Hoan Kiem Lake',
          formattedAddress: 'Hoan Kiem Lake, Hanoi, Vietnam',
          countryCode: 'VN',
          latitude: 21.028511,
          longitude: 105.854444,
          timezone: null,
          provider: 'OSM',
          providerPlaceId: 'node:67890'
        }
      }
    });
  });

  it('validates latitude and longitude query parameters', async () => {
    await request(createApp())
      .get('/api/v1/places/reverse-geocode')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ lat: 91, lng: 105.854444 })
      .expect(422);
  });
});
