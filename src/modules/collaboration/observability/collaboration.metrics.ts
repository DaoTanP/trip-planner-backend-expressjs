type MetricCounter =
  | 'joins'
  | 'leaves'
  | 'reconnects'
  | 'presenceUpdates'
  | 'tripUpdates'
  | 'planningInvalidations'
  | 'revisionConflicts'
  | 'websocketErrors'
  | 'heartbeatTimeouts'
  | 'authFailures'
  | 'authorizationFailures'
  | 'validationFailures'
  | 'rateLimited'
  | 'cursorDropped'
  | 'missedEventRecoveries'
  | 'syncFailures'
  | 'redisFailures';

type MetricGauge = 'activeConnections' | 'activeUsers' | 'activeRooms';

export type CollaborationMetricsSnapshot = {
  counters: Record<MetricCounter, number>;
  gauges: Record<MetricGauge, number>;
  heartbeatLatencyMs: {
    count: number;
    average: number;
    max: number;
  };
};

class CollaborationMetrics {
  private readonly counters: Record<MetricCounter, number> = {
    joins: 0,
    leaves: 0,
    reconnects: 0,
    presenceUpdates: 0,
    tripUpdates: 0,
    planningInvalidations: 0,
    revisionConflicts: 0,
    websocketErrors: 0,
    heartbeatTimeouts: 0,
    authFailures: 0,
    authorizationFailures: 0,
    validationFailures: 0,
    rateLimited: 0,
    cursorDropped: 0,
    missedEventRecoveries: 0,
    syncFailures: 0,
    redisFailures: 0
  };

  private readonly gauges: Record<MetricGauge, number> = {
    activeConnections: 0,
    activeUsers: 0,
    activeRooms: 0
  };

  private heartbeatLatencyTotal = 0;
  private heartbeatLatencyCount = 0;
  private heartbeatLatencyMax = 0;

  increment(counter: MetricCounter, amount = 1) {
    this.counters[counter] += amount;
  }

  setGauge(gauge: MetricGauge, value: number) {
    this.gauges[gauge] = value;
  }

  recordHeartbeatLatency(latencyMs: number) {
    this.heartbeatLatencyTotal += latencyMs;
    this.heartbeatLatencyCount += 1;
    this.heartbeatLatencyMax = Math.max(this.heartbeatLatencyMax, latencyMs);
  }

  snapshot(): CollaborationMetricsSnapshot {
    return {
      counters: { ...this.counters },
      gauges: { ...this.gauges },
      heartbeatLatencyMs: {
        count: this.heartbeatLatencyCount,
        average:
          this.heartbeatLatencyCount === 0
            ? 0
            : this.heartbeatLatencyTotal / this.heartbeatLatencyCount,
        max: this.heartbeatLatencyMax
      }
    };
  }
}

export const collaborationMetrics = new CollaborationMetrics();
