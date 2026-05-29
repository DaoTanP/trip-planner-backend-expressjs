# AI Development Rules

This document is the operational rulebook for AI-assisted development in this backend project.

## 1. What AI Agents MUST Do

AI agents must:

- Read relevant docs before changing architecture or domain behavior.
- Follow the modular monolith structure.
- Keep controllers thin.
- Put business logic in services.
- Put Prisma access in repositories.
- Validate request input with Zod.
- Throw typed application errors.
- Use localization keys for user-facing backend messages.
- Use shared response helpers.
- Preserve existing naming and folder patterns.
- Update docs when architectural, domain, or convention decisions change.
- Prefer small, focused changes.
- Run available tests and type checks when tooling exists.

## 2. What AI Agents MUST NEVER Do

AI agents must never:

- Access Prisma directly in controllers.
- Introduce inconsistent folder structures.
- Add microservices.
- Add CQRS without explicit documented need.
- Add event-driven workflows for simple synchronous behavior.
- Create giant shared utility files.
- Hide business rules in repositories.
- Read `process.env` outside config.
- Log secrets or tokens.
- Use `any` as a shortcut.
- Bypass permission checks.
- Duplicate validation logic across modules.
- Revert unrelated user changes.
- Introduce dependencies without justification.
- Hardcode user-facing validation, notification, email, or operational error text in business logic.

## 3. Architectural Consistency Rules

Required flow:

```text
route -> validation middleware -> controller -> service -> repository -> Prisma
```

Allowed cross-module call:

```text
itinerary.service -> trips.service for permission checks
```

Forbidden cross-module call:

```text
itinerary.repository -> trips.repository
```

Common code must not import business modules.

## 4. Refactoring Rules

Refactor only when:

- it directly supports the requested change
- it removes meaningful duplication
- it reduces complexity
- it aligns code with existing conventions

Do not refactor unrelated modules. Do not rename public APIs casually. Do not move files unless the new structure is clearly better and documented.

## 5. Dependency Management Rules

Before adding a dependency, verify:

- the standard library or existing dependency cannot reasonably solve it
- it is maintained
- it does not force architectural changes
- it is appropriate for a small team

Add dependencies to the correct section of `package.json`. Update docs if the dependency changes architecture, infrastructure, or development workflow.

## 6. File Creation Rules

New module files must follow:

```text
<module>.controller.ts
<module>.service.ts
<module>.repository.ts
<module>.schemas.ts
<module>.routes.ts
<module>.types.ts
```

Create new folders only when needed. Do not create empty placeholder folders unless they are part of a documented architecture boundary.

## 7. Naming Consistency Rules

Use existing naming style:

- `TripsService`
- `tripsService`
- `TripsRepository`
- `tripsRepository`
- `createTripSchema`
- `CreateTripInput`

Do not mix names like `TripManager`, `TripDAO`, or `TripHandler` into modules that already use service/repository/controller naming.

## 8. Error Handling Rules

Use typed errors:

```ts
throw new NotFoundError('Trip');
throw new AuthorizationError();
throw new ConflictError('Email is already registered');
```

Never manually shape error responses in controllers. Let `errorHandler` own API error formatting.

## 9. Validation Rules

All external input must be validated before use.

Validate:

- request body
- route params
- query strings
- job payloads when they may come from outside the current code path
- AI provider output before persistence

Zod handles shape and scalar constraints. Services handle stateful domain rules.

## 10. Database Access Rules

Rules:

- Prisma client lives in `src/prisma/client.ts`.
- Repositories import Prisma.
- Services import repositories.
- Controllers never import Prisma.
- Use transactions for multi-write invariants.
- Use relational fields for core relationships.
- Use JSONB only for flexible metadata, not primary relationships.

Forbidden:

```ts
// controller
await prisma.trip.create(...)
```

Allowed:

```ts
// service
await this.repository.create(...)
```

## 11. Documentation Update Rules

Update docs when:

- a module pattern changes
- a new infrastructure component is introduced
- a new domain invariant is added
- a convention is introduced or changed
- a major dependency changes how the app is built or run
- an architectural tradeoff needs preservation

Use ADRs for decisions that future maintainers may question.

## 12. Scalability Rules

Scale conservatively:

- optimize queries before adding infrastructure
- add Redis cache only for measured or obvious high-read paths
- move slow or retryable work to BullMQ
- keep API nodes stateless
- keep workers idempotent

Do not add distributed systems patterns before the monolith has real pressure.

## 13. Performance Considerations

AI agents should check:

- unbounded list queries
- missing pagination
- excessive `include` trees
- N+1 query risks
- cache keys without TTL
- jobs that retry unsafe side effects
- large request body limits
- synchronous work inside HTTP requests

Prefer targeted fixes over global rewrites.

## 14. Anti-Pattern Detection Rules

Flag these immediately:

- controller imports `@/prisma/client`
- service imports Express `Request` or `Response`
- repository imports a service
- module imports another module's repository
- new global helper with mixed concerns
- copied Zod schemas
- manual response shapes
- `console.log`
- `catch {}` with no logging or rethrow
- queue payload typed as `any`
- Redis client created outside config

## 15. Reusability Rules

Reusable code must have a real second use or a clear framework role.

Allowed shared abstractions:

- error classes
- middleware
- logger
- response helpers
- Redis client
- queue config
- object storage interface

Avoid speculative shared abstractions for future features.

## 16. Modularity Rules

Each module owns its language and behavior.

Examples:

- `auth` owns tokens and sessions.
- `auth/providers` owns OAuth credential verification.
- `trips` owns trip access and trip lifecycle.
- `itinerary` owns flat timeline items and reorder behavior.
- `places` owns place records and provider normalization.
- `notifications` owns notification read state and delivery contracts.

Do not put trip permission logic in `places` or notification delivery rules in `auth`.

Auth agents must keep provider SDK calls behind provider abstractions, keep session/token issuance in `AuthService`, and keep browser transport concerns in cookie helpers. Do not put OAuth verification in controllers or frontend-facing docs only.

## 17. Testing Expectations

For meaningful changes, add or update tests covering:

- successful workflow
- validation failure
- unauthorized or forbidden access
- not found behavior
- important side effects such as token revocation or job enqueueing

Prefer integration tests for API workflows. Unit tests are appropriate for complex pure business logic.

## 18. Code Review Checklist For AI-Generated Code

Before considering AI-generated code complete, verify:

- The folder structure matches existing conventions.
- Controllers contain no business logic.
- Services enforce permissions and domain rules.
- Repositories are the only normal Prisma access layer.
- Inputs are validated with Zod.
- Errors use typed error classes.
- User-facing messages use localization keys or module-owned templates.
- Notification persistence stores localization codes and params, not rendered copy.
- Responses use response helpers.
- API shape changes update `src/api/contracts/v1.ts` and the synced frontend contract.
- Controllers serialize records into contract DTOs instead of returning raw Prisma relation graphs.
- Logs use Pino and contain no secrets.
- Env vars are parsed through `env`.
- Redis and BullMQ use shared config.
- New dependencies are justified.
- Tests or a clear verification note are included.
- Architecture, conventions, domain rules, or ADR docs are updated if needed.

## 19. Trip Editor Rules

AI agents changing the trip editor backend must:

- Keep trip editor writes behind `TripsService`, `ItineraryService`, or `PlacesService`.
- Treat `ItineraryItem` as a trip-scoped first-class entity with direct `tripId`.
- Keep day/date/location grouping presentation-only unless a future ADR explicitly reopens the decision.
- Do not reintroduce `TripDay`, `legacyDayId`, day-based routes, or day-target comment enums.
- Validate reorder payload ownership before transactional writes.
- Use intent-based reorder payloads. Clients send the moved item and neighbor IDs; the backend computes sparse `sortOrder` and rebalances only when necessary.
- Use stable spaced `sortOrder`, row `version`, optional `expectedVersion`, `clientMutationId`, optional `deviceId`, trip `revision`, and `ClientMutation` records for optimistic/realtime-safe mutations.
- Append `MutationEvent` rows in the same transaction as trip-affecting writes. Treat the event log as a sync/fanout/debug foundation, not as event sourcing.
- Keep `GET /trips/:tripId/mutation-events` revision-based and permission-checked through trip access rules.
- Serialize trip detail responses through `trip.serializer.ts` and keep them metadata-only.
- Return itinerary, generic notes, comments, places, routes, collaborators, and expenses through granular endpoints. Cursor paginate large collaborative resources.
- Update `src/api/contracts/v1.ts` and sync the frontend contract after API shape changes.
- Add provider configuration to `src/config/env.ts`, `.env.example`, and Docker compose.

AI agents must not:

- Return raw Prisma trip graphs to the frontend.
- Let websocket or future realtime handlers bypass permission checks.
- Move itinerary items across trips.
- Reintroduce required `dayId` ownership for itinerary items.
- Recreate `Destination` as an itinerary-location entity.
- Recreate `TripNote`, `ItineraryNote`, or any entity-specific note table; notes attach through typed `targetEntityType` and `targetEntityId` and target validation belongs behind the collaboration registry.
- Couple place search to a single external provider in controllers.
- Store route geometry as the source of truth for place coordinates.
