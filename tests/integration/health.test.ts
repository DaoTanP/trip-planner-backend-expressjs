import request from 'supertest';

import { createApp } from '@/app.js';

describe('health endpoint', () => {
  it('returns service health', async () => {
    const response = await request(createApp()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        app: 'trip-planner-api-test',
        environment: 'test'
      }
    });
  });
});
