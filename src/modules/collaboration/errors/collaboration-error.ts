import { ServerEvents } from '@/modules/collaboration/events/collaboration-event-registry.js';
import type {
  CollaborationErrorCode,
  CollaborationErrorPayload,
  CollaborationServerEvent
} from '@/modules/collaboration/types/collaboration.types.js';

export class CollaborationError extends Error {
  constructor(
    readonly code: CollaborationErrorCode,
    message: string,
    readonly retryAfterMs?: number
  ) {
    super(message);
  }
}

export function toCollaborationErrorPayload(error: unknown): CollaborationErrorPayload {
  if (error instanceof CollaborationError) {
    const payload: CollaborationErrorPayload = {
      code: error.code,
      message: error.message
    };

    if (error.retryAfterMs !== undefined) {
      payload.retryAfterMs = error.retryAfterMs;
    }

    return payload;
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Collaboration event failed'
  };
}

export function createCollaborationErrorEvent(
  error: unknown,
  tripId?: string
): CollaborationServerEvent {
  const payload = toCollaborationErrorPayload(error);

  return {
    type: ServerEvents.CollaborationError,
    ...(tripId ? { tripId } : {}),
    error: payload
  };
}
