# ADR 0012: Deterministic Planning Engine

## Status

Accepted

## Context

Trip planning rules were beginning to span route optimization, scheduling, budget insights, map warnings, collaboration summaries, and future AI-facing recommendations. Those rules need a deterministic backend boundary so the planner can explain trip quality without relying on UI code or AI prompts.

## Decision

Add `src/modules/planning-engine` as the deterministic business brain for planning read models.

The engine is read-only and composed from focused services:

- `SchedulingService`
- `TravelEstimator`
- `RuleEngine`
- `ValidationEngine`
- `PlannerMetrics`
- `SuggestionEngine`
- `PlanningAnalyzer`

Expose query-model endpoints under `/trips/:tripId/planning*`. Keep these DTOs separate from Trip DTOs. Use stable codes, message keys, params, affected entity IDs, confidence, and estimated improvements. Suggestions are preview-only and never mutate data automatically.

Successful durable mutations continue to increment `Trip.revision` and append `MutationEvent`. They also publish `planning.invalidated` so clients can refresh planning read models without refetching the whole planner.

## Consequences

- Future AI features consume Planning Engine outputs instead of replacing deterministic validation.
- Planning Engine read models can be cached by trip revision and travel mode.
- Route estimates, budget aggregates, metrics, issues, and suggestions remain derived and non-persistent.
- Adding new planning rules requires extending the engine boundary, not frontend components or core trip services.
