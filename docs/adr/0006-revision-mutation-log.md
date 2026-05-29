# ADR 0006: Revision And Mutation Log Foundations

## Status

Accepted

## Context

The planner is moving toward large collaborative trips, optimistic updates, future websocket fanout, and future offline/mobile sync. Phase 1 normalized trip editor data into flat itinerary items, generic notes, route segments, and granular resources, but clients still lacked a monotonic trip-level clock for catch-up and conflict detection.

## Decision

Add `Trip.revision` as a monotonic `BIGINT` and increment it inside the same transaction as every trip-affecting write. Add `MutationEvent` as a lightweight append-only log containing trip, actor, optional device, optional client mutation id, entity target, operation, payload, revision, and timestamp.

Keep normal reads on normalized resource tables. The mutation log is for sync catch-up, debugging, offline replay preparation, and future websocket fanout; it is not event sourcing and does not become the source of truth.

Expose a permission-checked catch-up endpoint:

```text
GET /trips/:tripId/mutation-events?afterRevision=<revision>
```

## Consequences

- Clients can track a latest trip revision without loading giant trip trees.
- Future websocket reconnect can catch up from the last known revision.
- `clientMutationId` and `deviceId` provide lightweight dedupe and echo-suppression hooks.
- Revisions are serialized as strings to avoid JavaScript integer precision issues.
- Every trip-affecting mutation must use the same transaction boundary for data writes, revision increment, and event append.
