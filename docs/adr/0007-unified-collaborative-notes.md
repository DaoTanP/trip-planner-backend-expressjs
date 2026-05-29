# ADR 0007: Unified Collaborative Notes

## Status

Accepted

## Context

The planner needs notes on trips, itinerary items, expenses, places, route segments, and future collaboration surfaces. Separate note tables per entity would duplicate permissions, pagination, optimistic update logic, websocket patching, and future offline replay handling.

Generic `targetEntityType` and `targetEntityId` keep the note table flexible, but generic targets need a lightweight integrity boundary so notes cannot attach to arbitrary IDs without ownership context.

## Decision

Use one `Note` model for collaborative notes. Notes use `NoteTargetEntityType`, `targetEntityId`, optional `tripId`, optional `parentNoteId`, author ownership, JSONB mentions/attachments/metadata, row `version`, timestamps, soft delete, and `lastClientMutationId`.

Add `CollaborationEntity` as a registry keyed by `(entityType, entityId)` with optional `tripId`. Trip, itinerary item, expense, place, route segment, and note records register themselves. Application services validate note targets through this registry instead of Prisma polymorphic relations.

Expose unified note endpoints:

```text
GET    /notes
POST   /notes
PATCH  /notes/:id
DELETE /notes/:id
```

Note create, update, and delete mutations increment `Trip.revision` and append `MutationEvent` in the same transaction.

## Consequences

- Trip notes, itinerary item notes, expense notes, place notes, route notes, and threaded replies share one contract.
- Permission checks stay centralized: collaborators can create notes, authors can edit/delete their own notes, and owners/admins can moderate.
- Future websocket, offline, mobile, reactions, mentions, tasks, and activity feeds can reuse the same collaboration registry.
- Database-level foreign keys remain simple; target integrity is enforced in application services.

## Alternatives Considered

### Entity-Specific Note Tables

Rejected because it would multiply APIs, pagination rules, optimistic cache handling, and realtime/offline patch logic.

### Polymorphic Prisma Relations

Rejected because Prisma does not model true polymorphic relations cleanly and each new target would add schema churn.

### Event-Sourced Notes

Rejected because the project only needs durable mutation logging for sync/fanout preparation. Normal reads still come from normalized tables.
