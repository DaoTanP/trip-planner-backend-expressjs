export const ClientEvents = {
  PresenceJoin: 'presence.join',
  PresenceLeave: 'presence.leave',
  PresenceHeartbeat: 'presence.heartbeat',
  PresenceFocusChanged: 'presence.focus.changed',
  PresenceEditStarted: 'presence.edit.started',
  PresenceEditStopped: 'presence.edit.stopped',
  PresenceCursorChanged: 'presence.cursor.changed',
  TripSubscribe: 'trip.subscribe',
  TripUnsubscribe: 'trip.unsubscribe',
  ConnectionAck: 'connection.ack'
} as const;

export const ServerEvents = {
  ConnectionState: 'connection.state',
  HeartbeatAck: 'heartbeat.ack',
  PresenceSnapshot: 'presence.snapshot',
  PresenceUserJoined: 'presence.user.joined',
  PresenceUserLeft: 'presence.user.left',
  PresenceUserUpdated: 'presence.user.updated',
  PresenceFocusUpdated: 'presence.focus.updated',
  PresenceEditUpdated: 'presence.edit.updated',
  PresenceJoin: 'presence.join',
  PresenceLeave: 'presence.leave',
  PresenceHeartbeat: 'presence.heartbeat',
  PresenceFocusChanged: 'presence.focus.changed',
  PresenceEditStarted: 'presence.edit.started',
  PresenceEditStopped: 'presence.edit.stopped',
  PresenceCursorChanged: 'presence.cursor.changed',
  TripUpdated: 'trip.updated',
  PlanningInvalidated: 'planning.invalidated',
  RevisionConflict: 'revision.conflict',
  CollaborationError: 'collaboration.error'
} as const;

export type ClientEventType = (typeof ClientEvents)[keyof typeof ClientEvents];
export type ServerEventType = (typeof ServerEvents)[keyof typeof ServerEvents];

export type CollaborationEventMap = {
  client: typeof ClientEvents;
  server: typeof ServerEvents;
};

export const presenceUpdateClientEvents = new Set<ClientEventType>([
  ClientEvents.PresenceJoin,
  ClientEvents.PresenceHeartbeat,
  ClientEvents.PresenceFocusChanged,
  ClientEvents.PresenceEditStarted,
  ClientEvents.PresenceEditStopped,
  ClientEvents.PresenceCursorChanged
]);

export const websocketCloseCodes = {
  policyViolation: 1008,
  restart: 1012
} as const;
