import type { CollaborationEntity } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

export type CollaborationEntityRecord = Pick<
  CollaborationEntity,
  'entityType' | 'entityId' | 'tripId'
>;

export class CollaborationRepository {
  findEntity(
    entityType: CollaborationEntity['entityType'],
    entityId: string
  ): Promise<CollaborationEntityRecord | null> {
    return prisma.collaborationEntity.findFirst({
      where: { entityType, entityId },
      select: {
        entityType: true,
        entityId: true,
        tripId: true
      }
    });
  }
}

export const collaborationRepository = new CollaborationRepository();
