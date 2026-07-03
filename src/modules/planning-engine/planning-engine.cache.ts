import type { PlanningEngineReadModel } from './planning-engine.types.js';

type CacheEntry = {
  expiresAt: number;
  planning: PlanningEngineReadModel;
};

export interface PlanningEngineCache {
  get(key: string): PlanningEngineReadModel | null;
  set(key: string, planning: PlanningEngineReadModel): void;
  deleteTrip(tripId: string): void;
}

export class InMemoryPlanningEngineCache implements PlanningEngineCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs = 30_000) {}

  get(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry.planning;
  }

  set(key: string, planning: PlanningEngineReadModel) {
    this.entries.set(key, {
      expiresAt: Date.now() + this.ttlMs,
      planning
    });
  }

  deleteTrip(tripId: string) {
    for (const key of this.entries.keys()) {
      if (key.startsWith(`${tripId}:`)) {
        this.entries.delete(key);
      }
    }
  }
}

export const planningEngineCache = new InMemoryPlanningEngineCache();
