# Domain Rules

This document defines the active Stop-First business rules for the Trip Planner backend.

## 1. Domain Terminology

- User: a person with an account.
- Trip: the aggregate root for a planned travel experience.
- Itinerary item: a stop in a trip, always linked to one reusable Place.
- Place: reusable location information shared across trips.
- Note: threaded collaborative text attached to a trip, itinerary item, expense, or place.
- Expense: the financial source of truth for spending.
- Budget: trip budget configuration only: currency, total limit, and metadata.
- Expense category: a trip-scoped classification for expenses.
- Collaborator: a user or invited email with access to a trip.
- Notification: a user-facing message about trip or system activity.

## 2. Aggregate Shape

```text
Trip
  -> ItineraryItem[]
  -> Expense[]
  -> Budget?
  -> Note[]
  -> TripCollaborator[]
  -> Notification[]
  -> ClientMutation[]
  -> MutationEvent[]

ItineraryItem
  -> Place
  -> Expense[]

Expense
  -> Trip
  -> ItineraryItem?
  -> ExpenseCategory?
  -> paidByUser?

Note
  -> parent Note?
  -> replies[]
```

## 3. Trip Rules

- A trip has exactly one owner.
- All major planning activity is scoped to a trip.
- Owners and editors can modify trip planning data.
- Viewers can read shared trip data.
- Trip status reflects lifecycle: DRAFT, PLANNED, ACTIVE, COMPLETED, ARCHIVED.
- Trip deletion is owner-only.
- Trip start date must be before or equal to end date.

## 4. Stop-First Itinerary Rules

- Every itinerary item belongs to exactly one trip.
- Every itinerary item must reference one place.
- Places are reusable records and must not be duplicated per trip for trip-specific state.
- Itinerary ordering is controlled only by stable spaced `sortOrder` values.
- Reordering stops must not create, update, repair, or synchronize routes.
- A stop may represent activity, lodging, food, shopping, transportation, or other trip events.
- Stop timing uses `startsAt` plus optional `durationMinutes`.
- Stop status is PLANNED, BOOKED, COMPLETED, or CANCELLED.
- Stop metadata is for low-queryability extension data only.

## 5. Place Rules

- Places are global reusable location records.
- Place provider data is normalized before persistence.
- Place coordinates are the location source of truth.
- Deleting a place with active stops should be treated as a protected operation or explicit data migration concern.

## 6. Notes Rules

- Notes are threaded.
- `parentNoteId` supports replies and nested replies.
- Notes can target TRIP, ITINERARY_ITEM, EXPENSE, or PLACE.
- Place-targeted notes require a trip scope because places are reusable globally.
- Frontends may hide reply actions, but backend thread support remains mandatory.
- Note mutations increment `Trip.revision` and append `MutationEvent`.

## 7. Expense Rules

- Expenses are the financial source of truth.
- Spending totals, remaining budget, and usage percentage are derived from non-deleted Expense rows.
- Expenses may optionally link to an itinerary item, category, and paying user.
- Expense attachments are stored on the expense record.
- Expense rows use soft-delete tombstones for collaboration and sync.

## 8. Budget Rules

- Budget is configuration, not a ledger.
- Budget stores only currency, totalLimit, metadata, version, and timestamps.
- Do not persist `spentAmount`, `remainingAmount`, or `usagePercentage`.
- Derived budget metrics are calculated dynamically from Expense data.

## 9. Sync Rules

- Trip-affecting writes increment `Trip.revision`.
- Trip-affecting writes append one `MutationEvent` in the same transaction.
- Replayable mutations may include `clientMutationId` and `deviceId`.
- Duplicate `clientMutationId` requests return canonical state when possible.
- Mutation events are sync/debug/fanout records, not event sourcing.
- Mutation event payloads must be normalized entity patches, not full trip snapshots.
- Realtime `trip.updated` broadcasts are derived from successful durable mutations and must not create extra writes or change revision semantics.
- Offline replay must use the original client mutation identity so idempotency and conflict handling remain backend-driven.

## 10. Collaboration Presence Rules

- Presence is ephemeral and must never be stored in PostgreSQL.
- Active user, focus, cursor, and editing state live only in Redis with TTL cleanup.
- Presence has its own `presenceRevision`, `snapshotVersion`, and websocket `eventSequence`. These are awareness versions and must not be treated as `Trip.revision`.
- Multiple browser tabs and devices are tracked independently. Reconnects from the same client/device may replace stale connections, but must not overwrite other tabs or devices.
- Websocket responses expose `PresenceProjection` only. Do not leak Redis record shape or connection IDs to clients.
- Activity state is derived from presence as Idle, Viewing, Editing, Dragging, or Disconnected. It is advisory UI state, not a domain lock.
- Editing presence is advisory. It must never lock entities or block writes.
- Websocket clients may only subscribe to trips they can access as owner, editor, viewer, or admin.
- Viewers may publish focus presence, but durable edits still require existing service-level edit authorization.
- Presence updates must not create `MutationEvent`, increment `Trip.revision`, or invalidate durable caches.
- Cursor and focus updates should be rate limited or throttled before Pub/Sub fanout.
- Shared selection, map focus, drag previews, follow mode, and live cursors are ephemeral collaboration state. They may guide the UI but must not persist, lock entities, or override optimistic concurrency.

## 11. Removed Concepts

- RouteSegment is removed.
- Route persistence is removed.
- Cached route geometry is removed.
- Route chain synchronization and repair are removed.
- Comment and CollaborationEntity tables are removed.
- Routes are derived data generated on demand by clients or future provider services. Persist only lightweight route intent, such as stop-pair travel mode preferences; do not persist route geometry, duration, distance, polylines, or provider output.

## 12. Planning Intelligence Rules

- Planning intelligence is derived data and must not be persisted as source-of-truth planner state.
- Recommendations are optional. The backend must never reorder stops, change schedules, add places, or update budgets automatically.
- Route optimization returns a preview with recommended item IDs, estimated savings, confidence, and assumptions. Applying any recommendation must go through existing mutation APIs with optimistic concurrency.
- Planning warnings use structured codes, categories, severities, entity references, and params. Clients must not parse backend prose to understand warnings.
- Planning scores must expose dimension scores and explanation keys. Do not return unexplained magic numbers.
- Budget insights are derived from `Expense` and `Budget`; never persist calculated remaining budget, projected spend, or category totals.
- Map grouping is presentation-only. Do not reintroduce `TripDay`, route segments, or persisted group entities.
- Future AI providers may generate recommendations, but deterministic services remain the boundary that validates permissions, versions, and output shape.

## 13. Planning Engine Rules

- Planning Engine read models are derived from normalized trips, itinerary items, places, route preferences, expenses, budget, notes, collaborators, and mutation events.
- Planning Engine outputs must not be stored as source-of-truth data. Do not persist issues, metrics, timeline segments, route estimates, scores, or suggestions.
- Every validation returns structured data: severity, code, validation kind, message key, affected entity IDs, params, confidence, and recommended action. Avoid boolean validation APIs.
- Constraint logic must be reusable. Add new constraints to the rule engine instead of hardcoding one-off checks in controllers, services, or UI components.
- Suggestions are preview-only and optional. Applying a suggestion must use normal mutation APIs with optimistic concurrency, `clientMutationId`, row version checks, and trip revision checks.
- Travel estimates are derived. Do not persist calculated route geometry, duration, distance, provider response, unreachable state, or warning labels.
- Budget planning uses `Expense` and `Budget` only. Do not store derived daily spend, remaining budget, overspending, or expensive-destination aggregates.
- Planning invalidation is realtime cache guidance only. It must not create extra database writes or change `Trip.revision`.
