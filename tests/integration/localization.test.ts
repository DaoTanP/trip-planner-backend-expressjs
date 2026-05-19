import request from 'supertest';

import { createApp } from '@/app.js';

describe('localization', () => {
  it('localizes validation responses from Accept-Language', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/register')
      .set('Accept-Language', 'es-MX,es;q=0.9,en;q=0.8')
      .send({
        email: 'not-an-email',
        password: 'Password1',
        name: 'Test User'
      })
      .expect(422);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'La solicitud no paso la validacion'
    });
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'body.email',
          messageKey: 'validation.invalidEmail',
          message: 'Se esperaba una direccion de email valida'
        })
      ])
    );
  });

  it('validates user timezone preferences with localized messages', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/register')
      .set('x-locale', 'es')
      .send({
        email: 'traveler@example.com',
        password: 'Password1',
        name: 'Test User',
        timezone: 'Mars/Base'
      })
      .expect(422);

    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'body.timezone',
          messageKey: 'validation.timezone.invalid',
          message: 'Se esperaba una zona horaria IANA valida'
        })
      ])
    );
  });
});
