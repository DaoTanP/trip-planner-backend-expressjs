import type {
  PresenceProjection,
  TripPresence
} from '@/modules/collaboration/types/collaboration.types.js';

export type CollaborationActivityState =
  | 'Idle'
  | 'Viewing'
  | 'Editing'
  | 'Dragging'
  | 'Disconnected';

export type CollaborationActivity = {
  state: CollaborationActivityState;
  entityType?: string | undefined;
  entityId?: string | undefined;
  startedAt?: number | undefined;
};

export function getPresenceActivity(presence: TripPresence): CollaborationActivity {
  if (presence.status === 'OFFLINE') {
    return { state: 'Disconnected' };
  }

  if (presence.editingEntityType && presence.editingEntityId) {
    return {
      state: presence.editingEntityType === 'ITINERARY' ? 'Dragging' : 'Editing',
      entityType: presence.editingEntityType,
      entityId: presence.editingEntityId,
      startedAt: presence.editingStartedAt
    };
  }

  if (presence.focusedEntityType && presence.focusedEntityId) {
    return {
      state: 'Viewing',
      entityType: presence.focusedEntityType,
      entityId: presence.focusedEntityId
    };
  }

  return { state: 'Idle' };
}

export function getProjectionActivity(projection: PresenceProjection): CollaborationActivity {
  if (projection.status === 'OFFLINE') {
    return { state: 'Disconnected' };
  }

  if (projection.editing) {
    return {
      state: projection.editing.entityType === 'ITINERARY' ? 'Dragging' : 'Editing',
      entityType: projection.editing.entityType,
      entityId: projection.editing.entityId,
      startedAt: projection.editing.startedAt
    };
  }

  if (projection.focus) {
    return {
      state: 'Viewing',
      entityType: projection.focus.entityType,
      entityId: projection.focus.entityId
    };
  }

  return { state: 'Idle' };
}
