import type { AuthenticatedUser } from '@/common/types/authenticated-user.js';
import type { Locale } from '@/common/localization/locales.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      id?: string;
      locale?: Locale;
      timezone?: string;
    }
  }
}

export {};
