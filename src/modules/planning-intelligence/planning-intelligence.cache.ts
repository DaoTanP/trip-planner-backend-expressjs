import type { PlanningAnalysisDto } from '@/api/contracts/index.js';

type CacheEntry = {
  expiresAt: number;
  analysis: PlanningAnalysisDto;
};

export interface PlanningIntelligenceCache {
  get(key: string): PlanningAnalysisDto | null;
  set(key: string, analysis: PlanningAnalysisDto): void;
}

export class InMemoryPlanningIntelligenceCache implements PlanningIntelligenceCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs = 30_000) {}

  get(key: string): PlanningAnalysisDto | null {
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry.analysis;
  }

  set(key: string, analysis: PlanningAnalysisDto): void {
    this.entries.set(key, {
      analysis,
      expiresAt: Date.now() + this.ttlMs
    });
  }
}

export const planningIntelligenceCache = new InMemoryPlanningIntelligenceCache();
