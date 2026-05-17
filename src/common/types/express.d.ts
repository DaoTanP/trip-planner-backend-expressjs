import type { AuthenticatedUser } from '@/common/types/authenticated-user.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      id?: string;
    }
  }
}

export {};
