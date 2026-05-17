import type { Prisma, RefreshToken, User } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

export class AuthRepository {
  findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  createUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data
    });
  }

  createRefreshToken(data: Prisma.RefreshTokenUncheckedCreateInput): Promise<RefreshToken> {
    return prisma.refreshToken.create({
      data
    });
  }

  findRefreshTokenByHash(tokenHash: string): Promise<(RefreshToken & { user: User }) | null> {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });
  }

  revokeRefreshToken(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() }
    });
  }

  async revokeTokenFamily(familyId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }
}

export const authRepository = new AuthRepository();
