import type { Prisma } from '@prisma/client';

import { NotFoundError } from '@/common/errors/not-found-error.js';
import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  normalizeLocale,
  normalizeTimeZone,
  type Locale
} from '@/common/localization/locales.js';
import { toPublicUser, type PublicUser } from '@/modules/auth/auth.types.js';
import type { UpdateProfileInput } from '@/modules/users/users.schemas.js';
import { usersRepository, type UsersRepository } from '@/modules/users/users.repository.js';

export type UserLocalizationPreferences = {
  locale: Locale;
  timezone: string;
};

export class UsersService {
  constructor(private readonly repository: UsersRepository = usersRepository) {}

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new NotFoundError({ resourceKey: 'resources.user' });
    }

    return toPublicUser(user);
  }

  async getLocalizationPreferences(userId: string): Promise<UserLocalizationPreferences> {
    const user = await this.repository.findLocalizationPreferencesById(userId);
    if (!user) {
      throw new NotFoundError({ resourceKey: 'resources.user' });
    }

    return {
      locale: normalizeLocale(user.locale) ?? DEFAULT_LOCALE,
      timezone: normalizeTimeZone(user.timezone) ?? DEFAULT_TIMEZONE
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
    if (input.locale !== undefined) data.locale = input.locale;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.preferences !== undefined) data.preferences = input.preferences;

    const user = await this.repository.update(userId, data);

    return toPublicUser(user);
  }
}

export const usersService = new UsersService();
