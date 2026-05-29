import type { ClientMutation } from '@prisma/client';

import { prisma } from '@/prisma/client.js';

export type IdempotentMutationRecord = Pick<
  ClientMutation,
  'tripId' | 'clientMutationId' | 'entityType' | 'entityId' | 'operation' | 'revision'
>;

export const findIdempotentMutation = (
  tripId: string,
  clientMutationId?: string
): Promise<IdempotentMutationRecord | null> => {
  if (!clientMutationId) {
    return Promise.resolve(null);
  }

  return prisma.clientMutation.findUnique({
    where: {
      tripId_clientMutationId: {
        tripId,
        clientMutationId
      }
    },
    select: {
      tripId: true,
      clientMutationId: true,
      entityType: true,
      entityId: true,
      operation: true,
      revision: true
    }
  });
};

export const ensureIdempotentMutation = async <TReplay>(
  tripId: string,
  clientMutationId: string | undefined,
  resolveReplay: (mutation: IdempotentMutationRecord) => Promise<TReplay | null>
): Promise<TReplay | null> => {
  const mutation = await findIdempotentMutation(tripId, clientMutationId);

  if (!mutation) {
    return null;
  }

  return resolveReplay(mutation);
};
