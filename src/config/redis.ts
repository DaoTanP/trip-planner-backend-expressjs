import { createClient, type RedisClientType } from 'redis';

import { logger } from '@/common/logger/logger.js';
import { env } from '@/config/env.js';

let client: RedisClientType | null = null;

export const getRedisClient = (): RedisClientType => {
  if (!client) {
    client = createClient({
      url: env.REDIS_URL
    });

    client.on('error', (error) => {
      logger.error({ err: error }, 'Redis client error');
    });
  }

  return client;
};

export const connectRedis = async (): Promise<void> => {
  const redis = getRedisClient();
  if (!redis.isOpen) {
    await redis.connect();
    logger.info('Redis connected');
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (client?.isOpen) {
    await client.quit();
    logger.info('Redis disconnected');
  }
};

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await getRedisClient().get(key);
    return value ? (JSON.parse(value) as T) : null;
  },

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await getRedisClient().set(key, serialized, { EX: ttlSeconds });
      return;
    }
    await getRedisClient().set(key, serialized);
  },

  async del(key: string): Promise<void> {
    await getRedisClient().del(key);
  }
};
