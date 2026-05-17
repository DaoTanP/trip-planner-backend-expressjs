import type { Prisma } from '@prisma/client';

import { NotFoundError } from '@/common/errors/not-found-error.js';
import { toPublicUser, type PublicUser } from '@/modules/auth/auth.types.js';
import type { UpdateProfileInput } from '@/modules/users/users.schemas.js';
import { usersRepository, type UsersRepository } from '@/modules/users/users.repository.js';

export class UsersService {
  constructor(private readonly repository: UsersRepository = usersRepository) {}

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    return toPublicUser(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
    if (input.preferences !== undefined) data.preferences = input.preferences;

    const user = await this.repository.update(userId, data);

    return toPublicUser(user);
  }
}

export const usersService = new UsersService();
