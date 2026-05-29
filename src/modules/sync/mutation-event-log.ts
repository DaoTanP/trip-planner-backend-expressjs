import type { Prisma } from '@prisma/client';

export type AppendMutationEventInput = {
  tripId: string;
  actorId?: string | undefined;
  deviceId?: string | undefined;
  clientMutationId?: string | undefined;
  entityType: string;
  entityId?: string | null | undefined;
  operation: string;
  payload?: Prisma.InputJsonValue | null | undefined;
};

export const syncOperations = {
  created: 'ENTITY_CREATED',
  updated: 'ENTITY_UPDATED',
  moved: 'ENTITY_MOVED',
  deleted: 'ENTITY_DELETED',
  rebalanced: 'ENTITY_REBALANCED'
} as const;

export const createEntityPatchPayload = ({
  patchType,
  entityType,
  entityId,
  entity,
  fields,
  tombstone
}: {
  patchType: (typeof syncOperations)[keyof typeof syncOperations];
  entityType: string;
  entityId: string;
  entity?: Prisma.InputJsonValue | null | undefined;
  fields?: Prisma.InputJsonValue | null | undefined;
  tombstone?: Prisma.InputJsonValue | null | undefined;
}): Prisma.InputJsonObject => ({
  patchType,
  entityType,
  entityId,
  ...(entity !== undefined ? { entity } : {}),
  ...(fields !== undefined ? { fields } : {}),
  ...(tombstone !== undefined ? { tombstone } : {})
});

export const appendMutationEvent = async (
  tx: Prisma.TransactionClient,
  input: AppendMutationEventInput
): Promise<bigint> => {
  const trip = await tx.trip.update({
    where: { id: input.tripId },
    data: {
      revision: { increment: 1 }
    },
    select: {
      revision: true
    }
  });

  const eventData: Prisma.MutationEventUncheckedCreateInput = {
    tripId: input.tripId,
    entityType: input.entityType,
    operation: input.operation,
    revision: trip.revision
  };

  if (input.actorId !== undefined) eventData.actorId = input.actorId;
  if (input.deviceId !== undefined) eventData.deviceId = input.deviceId;
  if (input.clientMutationId !== undefined) eventData.clientMutationId = input.clientMutationId;
  if (input.entityId !== undefined) eventData.entityId = input.entityId;
  if (input.payload !== undefined) eventData.payload = input.payload;

  await tx.mutationEvent.create({
    data: eventData
  });

  if (input.clientMutationId) {
    const clientMutationData: Prisma.ClientMutationCreateManyInput = {
      tripId: input.tripId,
      clientMutationId: input.clientMutationId,
      entityType: input.entityType,
      operation: input.operation,
      revision: trip.revision
    };

    if (input.actorId !== undefined) clientMutationData.actorId = input.actorId;
    if (input.deviceId !== undefined) clientMutationData.deviceId = input.deviceId;
    if (input.entityId !== undefined) clientMutationData.entityId = input.entityId;

    await tx.clientMutation.createMany({
      data: [clientMutationData],
      skipDuplicates: true
    });
  }

  return trip.revision;
};
