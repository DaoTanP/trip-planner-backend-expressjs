import type { Prisma, User } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

export class UsersRepository {
  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data
    });
  }
}

export const usersRepository = new UsersRepository();
