# ADR 0011: Planning Intelligence Layer

## Status

Accepted

## Context

The planner already has normalized stops, places, expenses, notes, route preferences, mutation events, optimistic concurrency, realtime collaboration, and offline replay foundations. The next product step is to help users improve trips without taking control away from them.

This layer must not reintroduce route persistence, day grouping, automatic itinerary edits, or hidden AI decisions.

## Decision

Add `src/modules/planning-intelligence` as a read-only derived-data module.

The module exposes version-aware endpoints for analysis, recommendations, route optimization, and insights. It reads a normalized trip snapshot, computes deterministic outputs, and returns structured DTOs:

- planning issues with code, severity, category, entity references, params, and confidence
- route optimization previews with recommended item order, estimated savings, confidence, and assumptions
- schedule suggestions
- map clusters, isolated stops, heatmap cells, and grouping suggestions
- place recommendations from an internal deterministic provider
- budget insights and projections
- collaboration summaries from mutation events and ephemeral presence when available
- score dimensions with explanation keys

Recommendations are optional. `POST /trips/:tripId/optimize` returns a preview only; it never mutates itinerary order.

## Consequences

- The backend remains the source of truth, but intelligence remains derived.
- Clients can render insights without duplicating planning logic locally.
- Recommendations are safe with optimistic concurrency because they include the trip revision and must be applied through normal mutation APIs.
- Future AI providers can attach behind planning provider boundaries without coupling prompts to core business services.
- Brief caching by `(tripId, revision, options)` avoids recomputing on repeated reads while naturally invalidating after trip mutations.

## Alternatives Considered

Persist recommendation rows.

Reason not chosen: current recommendations are deterministic, revision-scoped, and cheap enough to recompute. Persisting them would create stale source-of-truth concerns.

Apply optimized routes automatically.

Reason not chosen: the planner must remain user-directed. Automatic reorder would conflict with collaborative editing, optimistic concurrency, and user intent.

Put route optimization in itinerary service.

Reason not chosen: itinerary owns writes and reorder invariants. Intelligence owns derived recommendations and future AI/provider integrations.
