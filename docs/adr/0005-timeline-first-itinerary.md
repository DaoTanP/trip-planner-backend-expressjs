# ADR 0005: Timeline-First Itinerary Model

## Status

Accepted

## Context

The planner is moving from calendar/day-grouped planning toward timeline-first, route-first, map-centric planning. Day ownership makes drag/drop, route optimization, realtime patching, offline reconciliation, and mobile clients harder because every item mutation risks touching a nested trip graph.

## Decision

Itinerary items are first-class trip-scoped entities ordered by stable spaced `sortOrder` values. `TripDay`, `legacyDayId`, day-target comments, and day-based reorder contracts are removed from the active model. Date, time-of-day, location, and custom grouping are presentation-only concerns computed by clients from flat itinerary items.

Trip detail responses stay metadata-only. The editor reads itinerary, places, routes, notes, collaborators, and expenses through granular resource endpoints.

Itinerary reordering is intent based. Clients send the moved item plus optional before/after neighbor IDs, and the backend computes the sparse `sortOrder` transactionally. Full-list reorder payloads are not part of the active contract.

Large collaborative resources use cursor pagination. Itinerary cursors are based on `(sortOrder, id)`; notes, comments, route segments, and expenses use stable timestamp/id cursors.

Trip notes and itinerary notes are represented by a generic `Note` entity with `targetEntityType` and `targetEntityId`. `ClientMutation` records persist client mutation IDs for future idempotency, websocket echo suppression, and offline/mobile replay.

`Destination` is not retained as a separate itinerary-location model. Normalized `Place` records and flat itinerary items carry location data; high-level city/region presentation can be derived in the UI or from trip metadata when needed.

## Consequences

- Reorder mutations update only the moved row in the normal case and rebalance sparse order only when no gap remains.
- Optimistic clients patch `itinerary` caches instead of replacing a full trip tree.
- Map markers derive from itinerary item IDs plus normalized `Place` records.
- Route geometry can be cached and reused through `RouteSegment`, with provider/from/to/travel-mode/profile-hash uniqueness.
- Notes use one generic collaboration table rather than feature-specific note tables.
- Comments use generic entity targeting so future expenses, notes, routes, and collaboration entities can receive comments without schema branching.
- Notifications store localization codes and params so clients can render copy in their active locale.
