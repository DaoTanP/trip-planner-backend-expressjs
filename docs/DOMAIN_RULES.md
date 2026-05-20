# Domain Rules

This document defines stable business rules and domain invariants for the Trip Planner backend. It is business-focused and intentionally separate from technical architecture.

## 1. Domain Terminology

- User: a person with an account.
- Trip: a planned travel experience owned by exactly one user.
- Destination: a city, region, or place included in a trip.
- Itinerary day: one calendar day within a trip plan.
- Activity: a planned action inside an itinerary day.
- Place: a reusable location record that may be attached to destinations or activities.
- Collaborator: a user or invited email with access to a trip.
- Owner: the user with ultimate control over a trip.
- Notification: a user-facing message about trip activity or system events.
- Recommendation: an AI or rules-based suggestion for trips, places, or activities.

## 2. Core Business Entities

Core entities:

- User
- Trip
- TripCollaborator
- Destination
- ItineraryDay
- Activity
- Place
- Comment
- Notification
- Recommendation, future

Entity relationships:

```text
User owns many Trips
Trip has many Destinations
Trip has many ItineraryDays
ItineraryDay has many Activities
Activity may reference one Place
Trip has many Collaborators
Trip, ItineraryDay, and Activity may have Comments
User has many Notifications
```

## 3. Ownership Rules

- A trip must always have exactly one owner.
- The owner must be an active user.
- Ownership cannot be empty.
- Ownership transfer must be explicit.
- Deleting or disabling a user must not leave owned trips without an owner.

Valid:

```text
Trip A ownerId = User 1
User 2 is EDITOR collaborator
```

Invalid:

```text
Trip A ownerId = null
Trip A has two owners
Owner removed through collaborator removal
```

## 4. Collaboration Rules

- Collaborators are scoped to one trip.
- Collaborators may be accepted users or pending invited emails.
- One user cannot have duplicate collaborator records for the same trip.
- A collaborator cannot remove or downgrade the owner.
- Pending invited collaborators do not have access until accepted.
- A user should not be both owner and normal collaborator for the same trip.

Valid:

```text
Trip owner: alice@example.com
Collaborator: bob@example.com, role EDITOR, acceptedAt set
Pending invite: clara@example.com, role VIEWER, acceptedAt null
```

Invalid:

```text
Two accepted collaborator rows for the same user and trip
Viewer changes another collaborator role
Pending invited email can access trip data
```

## 5. Permission Rules

Roles:

- OWNER: full control, including delete and collaborator management.
- EDITOR: can modify itinerary, destinations, activities, comments, and trip details.
- VIEWER: can read shared trip data and add comments only if the product explicitly allows it.

Baseline permission matrix:

```text
Action                  OWNER  EDITOR  VIEWER
Read trip               yes    yes     yes
Update trip             yes    yes     no
Delete trip             yes    no      no
Manage collaborators    yes    no      no
Create itinerary day    yes    yes     no
Create activity         yes    yes     no
Update activity         yes    yes     no
Read notifications      own    own     own
```

## 6. Trip Lifecycle Rules

Trip statuses:

- DRAFT: early planning, incomplete details allowed.
- PLANNED: dates and core itinerary are expected.
- ACTIVE: trip is currently happening.
- COMPLETED: trip has ended.
- ARCHIVED: hidden from normal active workflows.

Rules:

- A trip starts as DRAFT unless explicitly created otherwise.
- A PLANNED trip should have a valid date range.
- ACTIVE should only be used when the current date is within or near the trip range.
- COMPLETED trips should not accept destructive itinerary changes without explicit user intent.
- ARCHIVED trips should remain readable to permitted users.

Invalid:

```text
Trip endDate before startDate
Archived trip shown as active by default
Completed trip silently rewritten by AI generation
```

## 7. Activity Constraints

- Every activity must belong to exactly one itinerary day.
- An activity cannot exist directly under a trip without a day.
- An activity may reference a place, but manual activities without a place are valid.
- Activity order is scoped to its day.
- Activity status must reflect planning state: PLANNED, BOOKED, COMPLETED, or CANCELLED.
- Activity cost must not be negative.

Valid:

```text
Day 1
  Activity: Museum visit, order 1, status PLANNED
  Activity: Dinner, order 2, placeId null
```

Invalid:

```text
Activity without dayId
Activity cost = -10
Activity belongs to a day from another trip context
```

## 8. Date/Time Constraints

- Trip `startDate` must be before or equal to `endDate`.
- Itinerary day dates should fall within the trip range when the trip has dates.
- A trip day should be unique per trip and date.
- Activity `startTime` must be before or equal to `endTime`.
- Store timestamps in UTC.
- Preserve user-facing timezone on trips and activities.
- Date-only values represent local calendar dates, not instants.
- User timezone preferences must be valid IANA timezones and default to UTC.

Valid:

```text
Trip: 2026-06-01 to 2026-06-07
Day: 2026-06-03
Activity: 09:00 to 11:00 in Asia/Bangkok
```

Invalid:

```text
Trip: 2026-06-07 to 2026-06-01
Activity: ends before it starts
Day: duplicate date for same trip
```

## 9. Localization Rules

- Users have a preferred locale and timezone.
- User locale defaults to `en`; user timezone defaults to `UTC`.
- Unsupported request locales fall back to the default locale rather than failing unrelated workflows.
- Validation messages, notification templates, email templates, and operational error messages must be generated from localization keys.
- Business services should pass message keys and parameters, not final user-facing prose.
- Notification records store the rendered text plus template metadata for auditability and future re-rendering decisions.

Valid:

```text
User locale = es
Notification template = TRIP_INVITE
Rendered notification title = Invitacion de viaje
```

Invalid:

```text
Service embeds "Email is already registered" directly in business logic
Notification job chooses a hardcoded email subject without recipient locale
```

## 10. Notification Rules

- Notifications belong to one user.
- Notifications may reference a trip.
- Users can read only their own notifications.
- Notifications should be idempotent when generated from retryable jobs.
- Read state belongs to the notification recipient.
- Notification payloads must not contain secrets or sensitive token data.
- Notification content must come from localized templates.

Valid:

```text
User 1 receives TRIP_INVITE for Trip A
User 2 does not see User 1 notification
```

Invalid:

```text
One notification row shared by multiple recipients
Notification data contains raw invite token
```

## 11. AI Itinerary Generation Rules

AI-generated plans must never bypass core domain rules.

Rules:

- AI suggestions are suggestions until accepted by a permitted user.
- AI must not overwrite confirmed or booked activities without explicit user confirmation.
- AI output must be validated like user input.
- AI-generated activities must belong to itinerary days.
- AI must respect trip date range, timezone, budget, destination, and collaborator permissions.
- AI should preserve user-authored notes unless asked to replace them.
- AI recommendations must be traceable as AI-generated when stored.

Valid:

```text
AI proposes 5 activities for Day 2
Editor accepts 3 activities
Accepted activities are persisted after validation
```

Invalid:

```text
AI deletes booked hotel reservation
AI creates activity outside trip dates
AI changes a trip owned by another user without permission
```

## 12. Validation Invariants

Always enforce:

- Email addresses are case-insensitive.
- User names must be present.
- User locales and timezones must be valid supported values.
- OAuth provider accounts must map one provider subject to one user.
- OAuth auto-registration requires a verified provider email.
- Linking an OAuth provider to an existing email account is allowed only after provider-side email verification.
- Trip titles must be present.
- Required foreign keys must point to existing records.
- Enum values must be valid.
- UUID identifiers must be valid UUIDs.
- Free-form JSON must not replace core relational fields.

Business validation belongs in services when it depends on database state.

## 13. Data Consistency Rules

- A trip must not contain itinerary days from another trip.
- Activities must not be moved across trips without explicit handling.
- Collaborator permissions must be checked against the target trip.
- Comments must reference a target consistent with their trip.
- Destination and place links must remain optional but valid when present.
- Refresh token reuse must revoke the token family.
- Logging out revokes the presented refresh token and clears browser session cookies.
- Disabled users cannot obtain new sessions through password or OAuth login.

Invalid:

```text
Comment tripId = Trip A and activityId = Activity from Trip B
Activity dayId points to Day from a trip the user cannot edit
```

## 14. Deletion Rules

- Trip deletion is owner-only.
- Deleting a trip deletes its itinerary days, activities, comments, collaborators, and trip notifications as defined by persistence rules.
- Deleting an activity should not delete its place record.
- Removing a collaborator should not delete the user account.
- Logout revokes a refresh token, not the user account.

Destructive actions must be explicit and permission checked.

## 15. Soft Delete Policies

Current policy:

- Trips use `ARCHIVED` for non-destructive removal from active views.
- Notifications use `ARCHIVED` for hidden notifications.
- Refresh tokens use `revokedAt`.

Future soft delete fields may be added when recovery, audit, or compliance requires them. Do not add soft delete to every table by default.

## 16. Auditability Considerations

Important future audit events:

- ownership transfer
- collaborator invite, acceptance, role change, and removal
- destructive trip deletion
- AI-generated itinerary acceptance
- booked activity changes
- authentication anomalies such as refresh token reuse

Audit logging should be added when product or security needs justify it. Do not mix audit history into normal comments or notifications.

## 17. Future Extensibility Considerations

The domain should evolve toward:

- saved recommendation sets
- AI generation sessions
- itinerary version history
- realtime collaboration presence
- file attachments for bookings
- place search provider normalization
- analytics events

Future features must preserve existing invariants: one trip owner, activities under trip days, permissions scoped to trips, and AI output validated before persistence.
