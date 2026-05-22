import type { Request, Response } from 'express';
import { z } from 'zod';

import { validateRequest } from '@/common/middleware/validate-request.middleware.js';

describe('validateRequest', () => {
  it('replaces Express 5 read-only query getter with parsed query values', () => {
    const schema = z.object({
      query: z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().default(20)
      })
    });
    const req = {
      body: {},
      params: {}
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    Object.defineProperty(req, 'query', {
      get: () => ({ page: '2' }),
      enumerable: true,
      configurable: true
    });

    validateRequest(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({
      page: 2,
      limit: 20
    });
  });
});
