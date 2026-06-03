# ADR 0005: Stop-First Itinerary Model

## Status

Accepted

## Context

The planner is moving from calendar/day-grouped planning toward a stop-first, place-centric journey model. Day ownership and route-chain ownership make drag/drop, realtime patching, offline reconciliation, and mobile clients harder because every item mutation risks touching nested or derived structures.

## Decision

Itinerary items are first-class trip-scoped stops ordered by stable spaced `sortOrder` values. Each stop must reference a reusable `Place`, and stop identity is place-centric. `TripDay`, `legacyDayId`, day-target notes, route-chain fields, and day-based reorder contracts are removed from the active model. Date, time-of-day, location, and custom grouping are presentation-only concerns computed by clients from flat itinerary items.

Trip detail responses stay metadata-only. The editor reads itinerary, places, notes, collaborators, budget configuration, and expenses through granular resource endpoints.

Itinerary reordering is intent based. Clients send the moved item plus optional before/after neighbor IDs, and the backend computes the sparse `sortOrder` transactionally. Full-list reorder payloads are not part of the active contract.

Large collaborative resources use cursor pagination. Itinerary cursors are based on `(sortOrder, id)`; notes and expenses use stable timestamp/id cursors.

Trip notes and itinerary notes are represented by a generic threaded `Note` entity with `targetEntityType`, `targetEntityId`, and optional `parentNoteId`. `ClientMutation` records persist client mutation IDs for idempotency, websocket echo suppression, and offline/mobile replay.

`Destination` is not retained as a separate itinerary-location model. Normalized `Place` records and flat itinerary items carry location data; high-level city/region presentation can be derived in the UI or from trip metadata when needed.

## Consequences

- Reorder mutations update only the moved row in the normal case and rebalance sparse order only when no gap remains.
- Optimistic clients patch `itinerary` caches instead of replacing a full trip tree.
- Map markers derive from itinerary item IDs plus normalized `Place` records.
- Route geometry is derived data and is not persisted as route segments, route chains, or cached planner graph records.
- Notes use one generic threaded note table rather than feature-specific note/comment tables.
- Expenses are the source of truth for spending; budget rows store configuration only.
- Notifications store localization codes and params so clients can render copy in their active locale.
