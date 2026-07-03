import { getRedisClient } from '@/config/redis.js';
import { collaborationConfig } from '@/modules/collaboration/config/collaboration.config.js';
import type { TripPresence } from '@/modules/collaboration/types/collaboration.types.js';

export type UpsertPresenceRecordResult = {
  wasPresent: boolean;
  removedDuplicates: TripPresence[];
};

export interface PresenceRepository {
  getPresenceRevision(tripId: string): Promise<number>;
  nextPresenceRevision(tripId: string): Promise<number>;
  getSnapshot(tripId: string): Promise<TripPresence[]>;
  upsertPresence(presence: TripPresence): Promise<UpsertPresenceRecordResult>;
  removePresence(tripId: string, connectionId: string): Promise<TripPresence | null>;
  pruneStalePresences(tripId: string): Promise<TripPresence[]>;
}

export class RedisPresenceRepository implements PresenceRepository {
  private presenceKey(tripId: string) {
    return `${collaborationConfig.redisPrefix}:trip:presence:${tripId}`;
  }

  private revisionKey(tripId: string) {
    return `${collaborationConfig.redisPrefix}:trip:presence-revision:${tripId}`;
  }

  async getPresenceRevision(tripId: string) {
    const value = await getRedisClient().get(this.revisionKey(tripId));

    return value ? Number(value) : 0;
  }

  async nextPresenceRevision(tripId: string) {
    return getRedisClient().incr(this.revisionKey(tripId));
  }

  async getSnapshot(tripId: string): Promise<TripPresence[]> {
    const values = await getRedisClient().hGetAll(this.presenceKey(tripId));

    return Object.values(values)
      .map((value) => this.parsePresence(value))
      .filter((presence): presence is TripPresence => presence !== null)
      .filter((presence) => this.isFresh(presence))
      .sort((first, second) => second.lastSeen - first.lastSeen);
  }

  async upsertPresence(presence: TripPresence): Promise<UpsertPresenceRecordResult> {
    const key = this.presenceKey(presence.tripId);
    const redis = getRedisClient();
    const existing = await redis.hGet(key, presence.connectionId);
    const removedDuplicates = await this.removeDuplicateClientPresences(presence);

    await redis.hSet(key, presence.connectionId, JSON.stringify(presence));
    await redis.expire(key, collaborationConfig.presenceTtlSeconds);

    return {
      wasPresent: existing !== null && existing !== undefined,
      removedDuplicates
    };
  }

  async removePresence(tripId: string, connectionId: string): Promise<TripPresence | null> {
    const key = this.presenceKey(tripId);
    const redis = getRedisClient();
    const value = await redis.hGet(key, connectionId);

    if (!value) {
      return null;
    }

    await redis.hDel(key, connectionId);
    await this.expireOrDeleteKey(key);

    return this.parsePresence(value);
  }

  async pruneStalePresences(tripId: string): Promise<TripPresence[]> {
    const key = this.presenceKey(tripId);
    const redis = getRedisClient();
    const values = await redis.hGetAll(key);
    const staleConnectionIds: string[] = [];
    const stalePresences: TripPresence[] = [];

    for (const [connectionId, value] of Object.entries(values)) {
      const presence = this.parsePresence(value);

      if (!presence || !this.isFresh(presence)) {
        staleConnectionIds.push(connectionId);
        if (presence) {
          stalePresences.push(presence);
        }
      }
    }

    if (staleConnectionIds.length > 0) {
      await redis.hDel(key, staleConnectionIds);
      await this.expireOrDeleteKey(key);
    }

    return stalePresences;
  }

  private async removeDuplicateClientPresences(presence: TripPresence) {
    const key = this.presenceKey(presence.tripId);
    const redis = getRedisClient();
    const values = await redis.hGetAll(key);
    const duplicateConnectionIds: string[] = [];
    const duplicatePresences: TripPresence[] = [];

    for (const [connectionId, value] of Object.entries(values)) {
      if (connectionId === presence.connectionId) {
        continue;
      }

      const existing = this.parsePresence(value);

      if (
        existing &&
        existing.clientId === presence.clientId &&
        existing.deviceId === presence.deviceId
      ) {
        duplicateConnectionIds.push(connectionId);
        duplicatePresences.push(existing);
      }
    }

    if (duplicateConnectionIds.length > 0) {
      await redis.hDel(key, duplicateConnectionIds);
    }

    return duplicatePresences;
  }

  private async expireOrDeleteKey(key: string) {
    const remaining = await getRedisClient().hLen(key);

    if (remaining === 0) {
      await getRedisClient().del(key);
      return;
    }

    await getRedisClient().expire(key, collaborationConfig.presenceTtlSeconds);
  }

  private isFresh(presence: TripPresence) {
    return (
      presence.status !== 'OFFLINE' &&
      Date.now() - presence.lastSeen <= collaborationConfig.presenceTtlMs
    );
  }

  private parsePresence(value: string): TripPresence | null {
    try {
      const parsed = JSON.parse(value) as TripPresence;

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !parsed.tripId ||
        !parsed.userId ||
        !parsed.clientId ||
        !parsed.deviceId ||
        !parsed.connectionId
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }
}

export const redisPresenceRepository = new RedisPresenceRepository();
