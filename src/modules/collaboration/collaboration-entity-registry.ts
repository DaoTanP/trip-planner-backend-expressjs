import type { Prisma } from '@prisma/client';

export type RegisterCollaborationEntityInput = {
  entityType: Prisma.CollaborationEntityCreateManyInput['entityType'];
  entityId: string;
  tripId?: string | null | undefined;
};

export const registerCollaborationEntity = (
  tx: Prisma.TransactionClient,
  input: RegisterCollaborationEntityInput
) =>
  tx.collaborationEntity.createMany({
    data: [
      {
        entityType: input.entityType,
        entityId: input.entityId,
        tripId: input.tripId ?? null
      }
    ],
    skipDuplicates: true
  });
