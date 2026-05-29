# ADR 0008: Revision-Based Sync Runtime Foundation

- Status: Accepted
- Date: 2026-05-29

## Context

The trip planner needs deterministic reconciliation for collaborative editing, optimistic retries, future websocket fanout, and future mobile/offline sync. The platform already has flat itinerary entities, trip revisions, mutation events, generic notes, and cursor pagination.

## Decision

Trip-affecting mutations keep normalized writes as the source of truth and append lightweight `MutationEvent` rows in the same transaction. Events use stable entity patch operations: `ENTITY_CREATED`, `ENTITY_UPDATED`, `ENTITY_MOVED`, `ENTITY_DELETED`, and `ENTITY_REBALANCED`.

Replayable mutations accept `clientMutationId`, optional `deviceId`, and optional `expectedRevision`. Duplicate `clientMutationId` requests return canonical entity state when possible. Stale `expectedRevision` requests return `REVISION_CONFLICT` with the latest trip revision and optional latest entity details.

`GET /trips/:tripId/mutation-events` supports `sinceRevision`, `cursor`, and `limit`, and returns `latestRevision`, `hasMore`, and `nextCursor`.

## Consequences

- Clients can reconcile revision gaps without loading a full trip graph.
- Future websocket and offline replay can reuse the same mutation-event semantics.
- This is not event sourcing; reads still come from normalized tables and granular APIs.
- Conflicts are explicit and patch-friendly instead of being hidden as generic validation failures.
