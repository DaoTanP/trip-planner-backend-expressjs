# ADR 0010: Collaboration Backend

## Status

Accepted

## Context

The trip planner already uses optimistic concurrency through row `version`, trip `revision`, `ClientMutation`, and `MutationEvent`. The missing backend capability is human awareness: who is online, what they are viewing, what they appear to be editing, and when stale revisions create conflicts.

This is not CRDT or operational transform. Durable data remains owned by the existing HTTP services and PostgreSQL schema.

## Decision

Add `src/modules/collaboration` as a dedicated websocket and Redis-backed awareness module.

- `gateway/` attaches a `ws` server to the Node HTTP server at `/ws/collaboration` and delegates lifecycle work.
- `services/` contains `CollaborationService`, which coordinates connection lifecycle, trip authorization, middleware, dispatch, presence projection, and Pub/Sub fanout.
- `gateway/connection-manager.ts` tracks sockets, trip rooms, multiple tabs/devices, duplicate reconnect cleanup, heartbeat state, and graceful shutdown.
- `presence/` stores active presence in Redis hashes with TTL cleanup through `PresenceRepository` and `RedisPresenceRepository`.
- `events/` owns typed event names, standard websocket envelopes, per-trip event sequencing, and Redis Pub/Sub publishing.
- `validators/` defines typed and validated client event payloads.
- `types/` owns the collaboration event contract.
- `observability/` exposes metrics boundaries without coupling to a monitoring vendor.

Presence and editing indicators are advisory. They never lock entities and never write to PostgreSQL.

## Event Lifecycle

Every outbound websocket message is wrapped in a standard envelope:

```json
{
  "id": "uuid",
  "timestamp": "2026-07-01T00:00:00.000Z",
  "generatedAt": "2026-07-01T00:00:00.000Z",
  "eventType": "presence.focus.updated",
  "type": "presence.focus.updated",
  "tripId": "trip-id",
  "userId": "user-id",
  "eventSequence": 42,
  "presenceRevision": 7,
  "payload": {}
}
```

The duplicated `type` field preserves frontend compatibility while `eventType` and `payload` provide the versioned envelope contract. `eventSequence` is a Redis-backed per-trip sequence for websocket gap detection. It is not durable sync state and must not be confused with `Trip.revision`.

Presence snapshots include `snapshotVersion`, `presenceRevision`, `generatedAt`, and `activeUserCount`. Clients that detect skipped event sequences request `trip.subscribe` again to receive a fresh snapshot without a page reload.

## Redis Model

Presence records use Redis hashes keyed by collaboration prefix and trip ID. Hash fields are connection IDs; values are serialized server-side presence records. The service never exposes those records directly. Clients receive `PresenceProjection`, which includes user display data, focus/editing summaries, activity, device count, and connection count.

Presence revisions and event sequences use separate Redis counters:

- `trip:presence-revision:{tripId}` for ephemeral awareness snapshots.
- `trip:event-sequence:{tripId}` for websocket event ordering.

Redis Pub/Sub channels remain trip-scoped so horizontally scaled API instances can fan out to their local sockets.

## Websocket Flow

1. Client opens `ws://host/ws/collaboration?tripId=<tripId>`.
2. Gateway authenticates the access token.
3. Gateway verifies trip access through `TripsService.getAccessContext`.
4. Gateway joins the trip room and sends `presence.snapshot`.
5. Client sends `presence.join`, heartbeat, focus, edit, cursor, subscribe, or unsubscribe events.
6. `CollaborationService` validates and rate-limits the event, dispatches it to a typed handler, normalizes user identity from the server session, projects presence, and broadcasts trip-scoped events through Redis Pub/Sub.
7. On disconnect, duplicate reconnect, heartbeat timeout, or TTL expiry, the service removes presence and broadcasts leave events.

## Durable Update Flow

Trip-affecting writes still go through existing services. When `appendMutationEvent` records a durable mutation, the collaboration publisher emits a lightweight `trip.updated` event containing trip ID, revision, entity type, entity ID, operation, changed fields, a normalized patch payload, and the corresponding mutation-event DTO when available.

The websocket event is a cache synchronization hint, not a write model. Clients may patch TanStack Query caches directly when revisions are contiguous and the patch is deterministic. If revisions are skipped, the event is not patchable, or the client reconnects after downtime, the client uses `GET /trips/:tripId/mutation-events` to fetch missing durable events and falls back to scoped refetch only when incremental reconciliation is unsafe.

Clients send `connection.ack` with the latest websocket `eventSequence` they processed. The backend stores the acknowledged sequence per connection so future resend/session-resume support has a clean boundary. This acknowledgement is not persisted as durable sync state and is never compared to `Trip.revision`.

Revision conflicts remain HTTP `409 REVISION_CONFLICT` responses. When the service has actor and entity context, the backend also publishes a targeted `revision.conflict` event to that actor's active websocket connections.

## Offline And Reconnect Recovery

Offline-capable clients replay queued HTTP mutations in creation order with the original `clientMutationId`, `deviceId`, expected row version, and expected trip revision. Backend services remain idempotent through `ClientMutation`: duplicate replay attempts return canonical state, stale attempts return `REVISION_CONFLICT`, and successful attempts append exactly one `MutationEvent`.

Reconnect recovery compares the client's latest known trip revision with backend mutation events. The presence snapshot repairs ephemeral awareness state, while mutation-event catch-up repairs durable planner state.

## Consequences

- Presence scales horizontally through Redis instead of instance memory.
- Reconnects receive a current snapshot, not historical presence events.
- Multiple tabs/devices remain independent while duplicate reconnects from the same client/device are cleaned up.
- Snapshot recovery is possible when websocket events are dropped.
- Normal successful mutations can update active clients without broad query invalidation.
- Offline replay and reconnect recovery reuse the same `ClientMutation` and `MutationEvent` contracts.
- Presence outages do not affect durable trip writes.
- Future features such as live cursors, follow user, activity feed, comments, voice, or screen sharing can extend the collaboration module without changing planner persistence.

## Alternatives Considered

Store presence in PostgreSQL.

Reason not chosen: presence is high-churn ephemeral UI state and should not create durable rows, revisions, or cleanup burden.

Patch React Query caches directly inside websocket handlers.

Reason not chosen: websocket, polling, reconnect, and offline replay must share the same mutation-event reconciliation path. The frontend may patch caches directly, but that patching lives in the sync runtime rather than in transport handlers or feature components.

Place websocket logic in Express routes.

Reason not chosen: websocket lifecycle, Redis Pub/Sub, heartbeat, and room management are transport concerns and should not be mixed into HTTP controllers.
