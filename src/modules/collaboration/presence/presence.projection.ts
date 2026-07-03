import { getPresenceActivity } from '@/modules/collaboration/activity/collaboration-activity.js';
import type {
  PresenceDeviceProjection,
  PresenceProjection,
  TripPresence
} from '@/modules/collaboration/types/collaboration.types.js';

export function projectPresence(
  presence: TripPresence,
  tripPresences: TripPresence[]
): PresenceProjection {
  const userPresences = tripPresences.filter((candidate) => candidate.userId === presence.userId);
  const devicesById = new Map<string, PresenceDeviceProjection>();

  for (const candidate of userPresences) {
    const current = devicesById.get(candidate.deviceId);

    devicesById.set(candidate.deviceId, {
      deviceId: candidate.deviceId,
      connectionCount: (current?.connectionCount ?? 0) + 1,
      lastSeen: Math.max(current?.lastSeen ?? 0, candidate.lastSeen)
    });
  }

  const activity = getPresenceActivity(presence);

  return {
    tripId: presence.tripId,
    userId: presence.userId,
    displayName: presence.name,
    name: presence.name,
    avatar: presence.avatarUrl,
    avatarUrl: presence.avatarUrl,
    status: presence.status,
    ...(presence.focusedEntityType && presence.focusedEntityId
      ? {
          focus: {
            entityType: presence.focusedEntityType,
            entityId: presence.focusedEntityId
          }
        }
      : {}),
    ...(presence.editingEntityType && presence.editingEntityId
      ? {
          editing: {
            entityType: presence.editingEntityType,
            entityId: presence.editingEntityId,
            state: presence.editingState ?? 'EDITING',
            startedAt: presence.editingStartedAt
          }
        }
      : {}),
    ...(presence.cursor !== undefined ? { cursor: presence.cursor } : {}),
    clientId: presence.clientId,
    deviceId: presence.deviceId,
    connectionCount: userPresences.length,
    deviceCount: devicesById.size,
    devices: Array.from(devicesById.values()).sort(
      (first, second) => second.lastSeen - first.lastSeen
    ),
    activity: activity.state,
    lastSeen: presence.lastSeen
  };
}

export function projectPresences(presences: TripPresence[]) {
  return presences.map((presence) => projectPresence(presence, presences));
}
