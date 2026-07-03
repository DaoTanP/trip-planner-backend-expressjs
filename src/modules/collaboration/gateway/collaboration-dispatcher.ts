import type { CollaborationConnection } from '@/modules/collaboration/gateway/connection-manager.js';
import type { CollaborationClientEvent } from '@/modules/collaboration/types/collaboration.types.js';

export type CollaborationEventHandler<TEvent extends CollaborationClientEvent> = (
  connection: CollaborationConnection,
  event: TEvent
) => Promise<void>;

export type CollaborationHandlerRegistry = {
  [TEvent in CollaborationClientEvent as TEvent['type']]: CollaborationEventHandler<TEvent>;
};

export class CollaborationEventDispatcher {
  constructor(private readonly handlers: CollaborationHandlerRegistry) {}

  dispatch(connection: CollaborationConnection, event: CollaborationClientEvent) {
    const handler = this.handlers[event.type] as CollaborationEventHandler<typeof event>;

    return handler(connection, event);
  }
}
