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

## 10. Removed Concepts

- RouteSegment is removed.
- Route persistence is removed.
- Cached route geometry is removed.
- Route chain synchronization and repair are removed.
- Comment and CollaborationEntity tables are removed.
- Routes are derived data generated on demand by clients or future provider services. Persist only lightweight route intent, such as stop-pair travel mode preferences; do not persist route geometry, duration, distance, polylines, or provider output.
