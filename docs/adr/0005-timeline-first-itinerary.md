# ADR 0005: Timeline-First Itinerary Model

## Status

Accepted

## Context

The planner is moving from calendar/day-grouped planning toward timeline-first, route-first, map-centric planning. Day ownership makes drag/drop, route optimization, realtime patching, offline reconciliation, and mobile clients harder because every item mutation risks touching a nested trip graph.

## Decision

Itinerary items are first-class trip-scoped entities ordered by stable spaced `sortOrder` values. `TripDay` must not be required by new APIs. Date, time-of-day, location, and custom grouping are presentation-only concerns computed by clients from flat itinerary items.

Trip detail responses stay metadata-only. The editor reads itinerary, places, routes, notes, collaborators, and expenses through granular resource endpoints.

## Consequences

- Reorder mutations update only affected itinerary rows and increment versions.
- Optimistic clients patch `itinerary` caches instead of replacing a full trip tree.
- Map markers derive from itinerary item IDs plus normalized `Place` records.
- Route geometry can be cached and reused through `RouteSegment`.
- Legacy day tables/routes may exist temporarily for migration compatibility, but they are not the forward model.
