import type { RevisionConflictDetails } from '@/common/errors/revision-conflict-error.js';
import type { ServerEventType } from '@/modules/collaboration/events/collaboration-event-registry.js';

export const presenceEntityTypes = [
  'TRIP',
  'ITINERARY',
  'ITINERARY_ITEM',
  'PLACE',
  'EXPENSE',
  'BUDGET',
  'NOTE',
  'MAP'
] as const;

export type PresenceEntityType = (typeof presenceEntityTypes)[number];
export type PresenceUserStatus = 'ACTIVE' | 'IDLE' | 'OFFLINE';
export type PresenceState = 'VIEWING' | 'EDITING' | 'REPLYING';
export type CollaborationUserRole = 'USER' | 'ADMIN';

export type PresenceCursor = {
  x: number;
  y: number;
  entityType?: PresenceEntityType | undefined;
  entityId?: string | undefined;
};

export type TripPresence = {
  tripId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  status: PresenceUserStatus;
  focusedEntityType?: PresenceEntityType | undefined;
  focusedEntityId?: string | undefined;
  editingEntityType?: PresenceEntityType | undefined;
  editingEntityId?: string | undefined;
  editingState?: Extract<PresenceState, 'EDITING' | 'REPLYING'> | undefined;
  editingStartedAt?: number | undefined;
  cursor?: PresenceCursor | null | undefined;
  lastSeen: number;
  deviceId: string;
  clientId: string;
  connectionId: string;
};

export type CollaborationUser = {
  id: string;
  email: string;
  role: CollaborationUserRole;
  name: string;
  avatarUrl: string | null;
};

export type CollaborationConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export type PresenceFocusProjection = {
  entityType: PresenceEntityType;
  entityId: string;
};

export type PresenceEditingProjection = {
  entityType: PresenceEntityType;
  entityId: string;
  state: Extract<PresenceState, 'EDITING' | 'REPLYING'>;
  startedAt?: number | undefined;
};

export type PresenceDeviceProjection = {
  deviceId: string;
  connectionCount: number;
  lastSeen: number;
};

export type PresenceProjection = {
  tripId: string;
  userId: string;
  displayName: string;
  name: string;
  avatar: string | null;
  avatarUrl: string | null;
  status: PresenceUserStatus;
  focus?: PresenceFocusProjection | undefined;
  editing?: PresenceEditingProjection | undefined;
  cursor?: PresenceCursor | null | undefined;
  clientId: string;
  deviceId: string;
  connectionCount: number;
  deviceCount: number;
  devices: PresenceDeviceProjection[];
  activity: 'Idle' | 'Viewing' | 'Editing' | 'Dragging' | 'Disconnected';
  lastSeen: number;
};

export type PresenceSnapshotMetadata = {
  snapshotVersion: number;
  presenceRevision: number;
  generatedAt: string;
  activeUserCount: number;
};

export type PresenceSnapshot = PresenceSnapshotMetadata & {
  tripId: string;
  presences: PresenceProjection[];
  metadata: PresenceSnapshotMetadata;
};

export type ClientPresenceEventType =
  | 'presence.join'
  | 'presence.heartbeat'
  | 'presence.focus.changed'
  | 'presence.edit.started'
  | 'presence.edit.stopped'
  | 'presence.cursor.changed';

export type ClientTripPresence = {
  tripId: string;
  clientId: string;
  deviceId: string;
  userId?: string | undefined;
  name?: string | undefined;
  avatarUrl?: string | null | undefined;
  status?: PresenceUserStatus | undefined;
  focusedEntityType?: PresenceEntityType | undefined;
  focusedEntityId?: string | undefined;
  editingEntityType?: PresenceEntityType | undefined;
  editingEntityId?: string | undefined;
  editingState?: Extract<PresenceState, 'EDITING' | 'REPLYING'> | undefined;
  cursor?: PresenceCursor | null | undefined;
  lastSeen?: number | undefined;
};

export type CollaborationClientEvent =
  | {
      type: ClientPresenceEventType;
      presence: ClientTripPresence;
    }
  | {
      type: 'presence.leave';
      tripId: string;
      clientId?: string | undefined;
      deviceId?: string | undefined;
    }
  | {
      type: 'trip.subscribe';
      tripId: string;
    }
  | {
      type: 'trip.unsubscribe';
      tripId: string;
    }
  | {
      type: 'connection.ack';
      tripId: string;
      eventSequence: number;
    };

export type RealtimeEntityPatch = {
  entityType: string;
  entityId?: string | undefined;
  operation: string;
  revision: string;
  version?: number | undefined;
  changedFields?: string[] | undefined;
  payload?: Record<string, unknown> | null | undefined;
};

export type RealtimeMutationEvent = {
  id: string;
  tripId: string;
  actorId: string | null;
  deviceId: string | null;
  clientMutationId: string | null;
  entityType: string;
  entityId: string | null;
  operation: string;
  payload: Record<string, unknown> | null;
  revision: string;
  createdAt: string;
};

export type TripUpdatedEvent = {
  type: 'trip.updated';
  tripId: string;
  latestRevision: string;
  revision: string;
  entityType: string;
  entityId?: string | undefined;
  operation: string;
  version?: number | undefined;
  changedFields?: string[] | undefined;
  payload?: Record<string, unknown> | null | undefined;
  patch?: RealtimeEntityPatch | undefined;
  event?: RealtimeMutationEvent | undefined;
  actorId?: string | undefined;
  deviceId?: string | undefined;
  clientMutationId?: string | undefined;
  timestamp: string;
};

export type PlanningInvalidatedEvent = {
  type: 'planning.invalidated';
  tripId: string;
  revision: string;
  entityType: string;
  entityId?: string | undefined;
  affectedModels: Array<'issues' | 'metrics' | 'suggestions' | 'timeline' | 'route' | 'budget'>;
  timestamp: string;
};

export type RevisionConflictEvent = {
  type: 'revision.conflict';
  tripId: string;
  entityType: string;
  entityId?: string | undefined;
  operation?: string | undefined;
  localPayload?: Record<string, unknown> | undefined;
  details: RevisionConflictDetails;
  timestamp: string;
};

export type CollaborationErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export type CollaborationErrorPayload = {
  code: CollaborationErrorCode;
  message: string;
  retryAfterMs?: number | undefined;
};

export type CollaborationServerEvent =
  | {
      type: 'connection.state';
      state: CollaborationConnectionState;
      tripId?: string | undefined;
      reason?: string | undefined;
    }
  | {
      type: 'heartbeat.ack';
      tripId: string;
      timestamp: number;
    }
  | {
      type: 'presence.snapshot';
      tripId: string;
      presences: PresenceProjection[];
      metadata?: PresenceSnapshotMetadata | undefined;
      snapshotVersion?: number | undefined;
      presenceRevision?: number | undefined;
      generatedAt?: string | undefined;
      activeUserCount?: number | undefined;
    }
  | {
      type: 'presence.user.joined';
      presence: PresenceProjection;
    }
  | {
      type: 'presence.user.left';
      tripId: string;
      clientId: string;
      deviceId?: string | undefined;
      userId?: string | undefined;
    }
  | {
      type: 'presence.user.updated';
      presence: PresenceProjection;
    }
  | {
      type: 'presence.focus.updated';
      presence: PresenceProjection;
    }
  | {
      type: 'presence.edit.updated';
      presence: PresenceProjection;
    }
  | {
      type: ClientPresenceEventType;
      presence: PresenceProjection;
    }
  | {
      type: 'presence.leave';
      tripId: string;
      clientId: string;
      deviceId?: string | undefined;
      userId?: string | undefined;
    }
  | {
      type: 'collaboration.error';
      tripId?: string | undefined;
      error: CollaborationErrorPayload;
    }
  | TripUpdatedEvent
  | PlanningInvalidatedEvent
  | RevisionConflictEvent;

export type CollaborationServerEnvelope<TPayload = unknown> = {
  id: string;
  timestamp: string;
  generatedAt: string;
  eventType: ServerEventType;
  type: ServerEventType;
  tripId?: string | undefined;
  userId?: string | undefined;
  eventSequence: number;
  presenceRevision?: number | undefined;
  snapshotVersion?: number | undefined;
  payload: TPayload;
};

export type CollaborationPubSubEnvelope = {
  event: CollaborationServerEnvelope;
  targetUserId?: string | undefined;
  publishedAt: string;
};

export type TripSubscription = {
  tripId: string;
  role: string;
  canEdit: boolean;
};
