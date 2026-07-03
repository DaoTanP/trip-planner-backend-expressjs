import type { Prisma } from '@prisma/client';

import {
  schedulePlanningInvalidatedBroadcast,
  scheduleTripUpdatedBroadcast
} from '@/modules/collaboration/events/collaboration-publisher.js';
import type {
  RealtimeEntityPatch,
  RealtimeMutationEvent
} from '@/modules/collaboration/types/collaboration.types.js';

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

function asRecord(value: Prisma.InputJsonValue | null | undefined): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toRealtimePatch({
  tripRevision,
  input
}: {
  tripRevision: bigint;
  input: AppendMutationEventInput;
}): RealtimeEntityPatch {
  const payload = asRecord(input.payload);
  const fields = asRecord(payload?.fields as Prisma.InputJsonValue | null | undefined);
  const version = typeof fields?.version === 'number' ? fields.version : undefined;
  const changedFields = fields ? Object.keys(fields).sort() : undefined;

  return {
    entityType: input.entityType,
    ...(input.entityId ? { entityId: input.entityId } : {}),
    operation: input.operation,
    revision: tripRevision.toString(),
    ...(version !== undefined ? { version } : {}),
    ...(changedFields && changedFields.length > 0 ? { changedFields } : {}),
    payload
  };
}

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

  const mutationEvent = await tx.mutationEvent.create({
    data: eventData,
    select: {
      id: true,
      createdAt: true
    }
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

  const patch = toRealtimePatch({
    tripRevision: trip.revision,
    input
  });
  const tripUpdatedInput: Parameters<typeof scheduleTripUpdatedBroadcast>[0] = {
    tripId: input.tripId,
    latestRevision: trip.revision.toString(),
    revision: trip.revision.toString(),
    entityType: input.entityType,
    operation: input.operation,
    patch,
    event: {
      id: mutationEvent.id,
      tripId: input.tripId,
      actorId: input.actorId ?? null,
      deviceId: input.deviceId ?? null,
      clientMutationId: input.clientMutationId ?? null,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      operation: input.operation,
      payload: asRecord(input.payload),
      revision: trip.revision.toString(),
      createdAt: mutationEvent.createdAt.toISOString()
    } satisfies RealtimeMutationEvent
  };

  if (input.entityId !== undefined && input.entityId !== null) {
    tripUpdatedInput.entityId = input.entityId;
  }
  if (patch.version !== undefined) {
    tripUpdatedInput.version = patch.version;
  }
  if (patch.changedFields !== undefined) {
    tripUpdatedInput.changedFields = patch.changedFields;
  }
  if (patch.payload !== undefined) {
    tripUpdatedInput.payload = patch.payload;
  }
  if (input.actorId !== undefined) {
    tripUpdatedInput.actorId = input.actorId;
  }
  if (input.deviceId !== undefined) {
    tripUpdatedInput.deviceId = input.deviceId;
  }
  if (input.clientMutationId !== undefined) {
    tripUpdatedInput.clientMutationId = input.clientMutationId;
  }

  scheduleTripUpdatedBroadcast(tripUpdatedInput);
  schedulePlanningInvalidatedBroadcast({
    tripId: input.tripId,
    revision: trip.revision.toString(),
    entityType: input.entityType,
    ...(input.entityId ? { entityId: input.entityId } : {}),
    affectedModels: getPlanningAffectedModels(input.entityType)
  });

  return trip.revision;
};

function getPlanningAffectedModels(
  entityType: string
): Array<'issues' | 'metrics' | 'suggestions' | 'timeline' | 'route' | 'budget'> {
  if (entityType === 'EXPENSE' || entityType === 'BUDGET') {
    return ['issues', 'metrics', 'suggestions', 'budget'];
  }

  if (
    entityType === 'PLACE' ||
    entityType === 'ROUTE_PREFERENCE' ||
    entityType === 'TRIP_ROUTE_PREFERENCE'
  ) {
    return ['issues', 'metrics', 'suggestions', 'route'];
  }

  if (entityType === 'NOTE' || entityType === 'COLLABORATOR') {
    return ['metrics'];
  }

  return ['issues', 'metrics', 'suggestions', 'timeline', 'route', 'budget'];
}
