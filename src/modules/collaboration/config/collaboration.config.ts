import { env } from '@/config/env.js';

export const collaborationConfig = {
  enabled: env.COLLABORATION_WS_ENABLED,
  websocketPath: '/ws/collaboration',
  heartbeatIntervalMs: env.COLLABORATION_HEARTBEAT_INTERVAL,
  presenceTtlMs: env.COLLABORATION_PRESENCE_TTL,
  presenceTtlSeconds: Math.ceil(env.COLLABORATION_PRESENCE_TTL / 1000),
  redisPrefix: env.COLLABORATION_REDIS_PREFIX,
  rateLimitWindowMs: 60_000,
  rateLimits: {
    heartbeat: 90,
    presence: 180,
    subscription: 40
  },
  cursorThrottleMs: 75
} as const;
