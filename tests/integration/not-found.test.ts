import request from 'supertest';

import { createApp } from '@/app.js';

describe('not found handling', () => {
  it('returns a typed not found response', async () => {
    const response = await request(createApp()).get('/missing-route').expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND'
      }
    });
  });
});
