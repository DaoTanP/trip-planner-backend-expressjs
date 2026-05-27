# Architecture

This document is the architectural source of truth for the Trip Planner backend. It is written for humans and AI agents that will extend the system over time.

## 1. High-Level Architecture

The backend is a modular monolith built with Node.js, TypeScript, Express.js, PostgreSQL, Prisma, Redis, BullMQ, and Docker.

```text
Client
  -> Express HTTP API
  -> Route middleware
  -> Controller
  -> Service
  -> Repository
  -> Prisma
  -> PostgreSQL

Background work:
Service -> BullMQ Queue -> Worker -> Repository/External provider

Shared runtime:
Redis for cache, queues, rate limiting, and future realtime/session support
```

Why: a modular monolith gives a solo developer or small team strong boundaries without microservice deployment, network, and data consistency costs. The system can scale vertically first, then horizontally by running more API and worker containers.

## 2. Architectural Principles

- Keep the system simple until real pressure requires more complexity.
- Keep business rules in services, not controllers or repositories.
- Keep database access behind repositories.
- Keep module boundaries clear and explicit.
- Prefer boring, readable code over clever abstractions.
- Optimize for fast onboarding and AI-assisted consistency.
- Use shared infrastructure only for cross-cutting concerns.
- Add abstractions only when they remove repeated complexity.

## 3. Modular Monolith Design

Each business capability lives in `src/modules/<module-name>`.

```text
src/modules/trips/
  trips.controller.ts
  trips.service.ts
  trips.repository.ts
  trips.schemas.ts
  trips.routes.ts
```

A module owns its HTTP surface, validation, business logic, and data access for that capability. Modules may call another module service when they need its business rule, such as itinerary calling trip permission checks.

Why: this keeps code easy to find and prevents a global MVC structure from becoming a tangle of unrelated controllers, services, and models.

## 4. Folder Structure

```text
src/
  app.ts                  # Express app composition
  server.ts               # HTTP server lifecycle
  routes.ts               # API route composition
  config/                 # Environment and infrastructure clients
  prisma/                 # Prisma client singleton
  common/                 # Cross-cutting framework code
  modules/                # Business modules
  jobs/                   # Queue definitions and enqueue helpers
  workers/                # BullMQ worker entrypoints

prisma/
  schema.prisma
  seed.ts
  migrations/

tests/
  integration/
  setup.ts
```

`src/common` must stay small. It is for middleware, errors, logging, localization primitives, shared response helpers, storage interfaces, and common types. Business-specific helpers belong inside their module.

## 5. Module Boundaries

Allowed dependencies:

```text
controller -> service -> repository -> prisma
routes -> controller
module service -> another module service, only for business rules
common/config -> no business module imports
```

Forbidden dependencies:

```text
controller -> prisma
controller -> repository
repository -> service
common -> modules
module A repository -> module B repository
```

Why: dependency direction prevents cycles and keeps each layer easy to reason about.

## 6. Request Lifecycle

```text
HTTP request
  -> requestIdMiddleware
  -> localeMiddleware
  -> httpLogger
  -> helmet/cors/compression/body parsing
  -> rate limiter
  -> route
  -> optional authenticate middleware
  -> validateRequest(Zod schema)
  -> controller
  -> service
  -> repository
  -> response helper
  -> errorHandler if needed
```

Controllers should only extract request data, call services, and return formatted responses.

```ts
create = async (req, res) => {
  const trip = await this.service.createTrip(req.user.id, req.body);
  return sendCreated(res, { trip });
};
```

## 6a. API Contract Architecture

API v1 is mounted through `API_PREFIX`, which should be `/api/v1` for current deployments. Version-specific route composition lives in `src/api/v1.router.ts`; module routers still live with the module that owns the behavior.

The canonical TypeScript API contract lives in `src/api/contracts/v1.ts`. It defines success responses, error responses, pagination metadata, auth DTOs, trip DTOs, and route request/response mappings.

The frontend consumes a synced generated-style copy of this contract. Backend changes that affect API shape must update the contract first, then sync the frontend copy with `npm run contracts:sync`.

Why: OpenAPI generation is the preferred long-term direction for public or mobile clients, but this pure TypeScript contract keeps today’s two-repo setup lightweight for a solo/small team while preventing handwritten frontend DTO drift.

## 7. Database Access Flow

All normal database access flows through Prisma repositories.

```text
Service method
  -> Repository method
  -> Prisma query
  -> PostgreSQL
```

Why: repositories provide one place to adjust query shape, includes, pagination, and persistence details without rewriting business logic.

## 8. Repository Pattern Usage

Repositories:

- contain Prisma queries
- hide persistence details from services
- return domain-relevant records or query results
- do not contain authorization decisions
- do not format HTTP responses
- do not call Express APIs

Example:

```ts
export class TripsRepository {
  findById(id: string) {
    return prisma.trip.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { collaborators: true, itineraryItems: true } }
      }
    });
  }
}
```

## 9. Service Responsibilities

Services own business rules and orchestration.

Services should:

- enforce permissions
- validate domain state not covered by Zod
- coordinate multiple repositories or queues
- open transactions when a workflow must be atomic
- translate persistence results into domain behavior

Services should not know about `Request`, `Response`, route paths, or HTTP status codes.

## 10. Background Job Architecture

Jobs are used for work that should not block HTTP responses:

- notification delivery
- email sending
- AI itinerary generation
- recommendation refreshes
- analytics events
- file processing

```text
Service
  -> enqueue helper in src/jobs
  -> BullMQ queue
  -> worker in src/workers
  -> service/repository/external provider
```

Why: the API stays responsive and retries are handled by BullMQ instead of custom retry loops.

## 11. Redis Usage Strategy

Redis supports four concerns:

- Cache: short-lived read optimization.
- Queues: BullMQ storage and coordination.
- Rate limiting: distributed request limiting.
- Future realtime/session support: websocket coordination, presence, and session lookup.

Use Redis through `src/config/redis.ts` or BullMQ queue helpers. Do not create ad hoc Redis clients inside modules.

## 12. Error Handling Architecture

All operational errors should extend `AppError`.

```text
AppError
  ValidationError
  AuthError
  AuthorizationError
  NotFoundError
  ConflictError
```

The global error handler converts thrown errors into consistent API responses.

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Trip not found",
    "requestId": "req_..."
  }
}
```

Why: consistent error shapes are easier for clients, tests, logs, and AI agents to reason about.

Stable error `code` values are part of the API contract. Backend messages may be localized for non-web clients, but frontend UX should map codes to `next-intl` keys instead of displaying backend text blindly.

## 13. Validation Architecture

Zod validates request `body`, `params`, and `query` at route boundaries.

```ts
tripsRouter.post('/', validateRequest(createTripSchema), asyncHandler(tripsController.create));
```

Zod handles input shape. Services handle domain rules that require database state, permissions, or multi-entity checks.

## 14. Localization Architecture

Localization is a shared boundary in `src/common/localization`.

```text
HTTP request
  -> localeMiddleware
  -> validateRequest / controller / service
  -> errorHandler or response helper
```

The middleware resolves `req.locale` from `x-locale` or `Accept-Language`, and `req.timezone` from `x-timezone`. Unsupported values fall back to `en` and `UTC`.

Rules:

- Localized message keys live in the shared message catalog.
- Zod validation responses are localized in `validateRequest`, not inside individual controllers.
- Operational errors store message keys and parameters; the error handler translates them for the request locale.
- Domain modules own their user-facing templates. For example, notification and notification-email templates live in the notifications module and use shared translation helpers.
- Notification rows store `notificationCode` and `params`, not rendered title/body text. Frontends render localized notification copy from their own i18n catalog.
- User locale and timezone preferences are persisted on `User` and read through `UsersService` when another module needs recipient preferences.
- Date-only values remain local calendar dates. Instants are stored in UTC, with timezone fields preserved for user-facing formatting.

Why: this keeps business logic from hardcoding response text while avoiding a global template service that would own module-specific language.

## 15. Logging Strategy

Pino is the structured logger. Logs must be JSON in production and readable in development.

Log:

- request IDs
- job IDs
- important business workflow transitions
- unexpected errors
- external provider failures

Do not log:

- passwords
- raw tokens
- authorization headers
- full third-party payloads with secrets

## 16. Authentication Architecture

Authentication uses:

- JWT access tokens for short-lived API authorization
- refresh token rotation for long-lived sessions
- hashed refresh token persistence
- token families to detect reuse
- middleware to attach `req.user`
- backend-verified OAuth provider credentials
- provider accounts in `OAuthAccount`
- cookie-first browser sessions with optional body-token transport for non-browser clients
- CSRF protection for cookie-backed unsafe requests

```text
login/register -> issue access token + refresh token
google credential -> provider verifier -> account link/create user -> issue token pair
refresh -> verify token -> revoke old token -> issue new pair
reuse of revoked token -> revoke entire token family
logout -> revoke refresh token
```

OAuth provider logic lives behind provider verifiers in `src/modules/auth/providers`. Controllers never verify provider tokens directly; they validate request shape, call `AuthService`, set cookies, and return a typed response.

The backend remains the authentication source of truth. The frontend may collect a Google credential, but only the backend verifies issuer, audience, expiry, subject, and email verification before creating or linking a user. This prevents frontend-only trust and keeps future role, session, and account-linking rules centralized.

Token transport is controlled by `AUTH_TOKEN_TRANSPORT`:

- `cookie`: browser default; tokens are httpOnly cookies and omitted from response bodies.
- `body`: non-browser clients; tokens are returned in JSON.
- `both`: transitional mode for migrations.

The schema is ready for OAuth accounts, email verification, and multi-device sessions without changing unrelated modules.

## 17. Queue Architecture

Queue names live in `src/jobs/queue-names.ts`. Queue instances and enqueue helpers live in `src/jobs/*.queue.ts`. Workers live in `src/workers`.

```ts
export const notificationQueue = new Queue<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATIONS,
  queueOptions
);
```

Why: keeping queue contracts in one place prevents workers and services from drifting apart.

## 18. Scalability Strategy

Scale in this order:

1. Optimize database indexes and query shape.
2. Add targeted Redis caching for high-read, low-change data.
3. Move slow work to BullMQ workers.
4. Run multiple API containers behind a load balancer.
5. Run multiple worker containers by queue type.
6. Add read replicas or search infrastructure only when product usage justifies it.

Do not split into microservices until the monolith has clear independent scaling pain and stable ownership boundaries.

## 19. Future Extensibility Considerations

The current structure should support:

- AI itinerary generation in a dedicated module or job workflow
- recommendation systems using trip, place, and preference metadata
- realtime collaboration using Redis-backed websocket coordination
- file uploads through the object storage interface
- search using a future search module
- analytics through queue-backed events
- notification delivery through worker processors

Future integrations should enter through module services or provider interfaces, not through controllers.

## 20. Dependency Rules

Use these dependency rules:

```text
src/common -> shared infrastructure only
src/config -> runtime configuration only
src/modules/<name> -> module-local business capability
src/jobs -> queue contracts and enqueue functions
src/workers -> job processors
src/prisma -> Prisma client lifecycle
```

When one module needs another module's rule, call the other module's service. Do not import its repository.

## 21. Anti-Patterns To Avoid

- Prisma calls in controllers.
- Business logic in route files.
- Massive shared `utils` folders.
- Catching errors only to rethrow generic errors.
- Creating new Redis, Prisma, or queue clients inside modules.
- Cross-module repository imports.
- Circular dependencies.
- God services that own multiple domains.
- Premature event-driven workflows.
- CQRS without real read/write model pressure.
- Microservices for organizational style rather than operational need.
- New abstractions without repeated use or clear simplification.

## 22. Timeline-First Trip Planner Architecture

The editor API is now timeline-first, route-first, and map-centric. A trip detail response contains trip metadata, ownership, visibility, settings, and lightweight counts only. It must not return a giant nested trip tree.

```text
Trip
  -> ItineraryItem[]
  -> Place[]
  -> RouteSegment[]
  -> Note[]
  -> Collaborators[]
  -> Budget/Expense[]
```

`ItineraryItem` is a first-class entity with direct `tripId`, optional `placeId`, optional `routeSegmentId`, `sortOrder`, `version`, and soft delete fields. `TripDay`, `legacyDayId`, day-target comments, and day-based reorder contracts are not part of the active model.

Why: flat item sequences are easier to render as long timelines, reorder optimistically, synchronize with map markers, patch from realtime events, and reuse from future offline/mobile clients. Calendar day grouping can still exist, but it is computed from item times or UI labels and never required for persistence.

`Destination` is not an active planning entity. High-level city/region hints should be represented through trip metadata or normalized `Place` records only when they are useful to query or render; itinerary activities still reference `placeId` directly.

## 23. Granular Resource APIs

The trip editor reads separate resources:

- `GET /trips/:tripId` for metadata and summary counts.
- `GET /trips/:tripId/itinerary` for flat itinerary items.
- `GET /trips/:tripId/places` for normalized places used by the itinerary.
- `GET /trips/:tripId/routes` for cached route geometry.
- `GET /trips/:tripId/notes` for generic trip-scoped notes.
- `GET /trips/:tripId/collaborators` for sharing state.
- `GET /trips/:tripId/expenses` for budget analytics inputs.

Why: granular APIs keep payloads small, let TanStack Query invalidate only the changed resource, and make realtime/offline reconciliation possible without replacing a full trip graph after every mutation.

`Note` is a generic collaboration entity scoped to a trip and attached with `targetEntityType` plus `targetEntityId`. Trip notes, itinerary notes, route notes, and future expense/collaborator notes use the same table and application-level target validation.

## 24. Cursor Pagination, Ordering, And Optimistic Updates

Large collaboration resources use cursor pagination. Itinerary items page by `(sortOrder, id)`, while notes, comments, route segments, and expenses page by `(createdAt, id)`. Controllers return cursor metadata through `sendCursorPaginated` and `meta.pagination`.

Itinerary ordering uses spaced integer positions: `1024`, `2048`, `3072`, and so on. Reorder endpoints are intent based: the client sends the moved item and its new neighbors, then the backend computes the next sparse order inside a transaction.

```json
{
  "itemId": "...",
  "beforeItemId": "...",
  "afterItemId": "...",
  "expectedVersion": 3,
  "clientMutationId": "optional-client-id"
}
```

Services validate that the moved item and neighbors belong to the target trip before any writes occur. The common case updates only the moved row; a full sparse-order rebalance happens only when there is no gap left between neighbors.

Mutations echo `clientMutationId` where useful, increment row `version`, and may reject stale `expectedVersion` values. A lightweight `ClientMutation` table records mutation IDs for idempotency, future websocket dedupe, and offline/mobile replay without introducing event sourcing.

## 25. Place And Route Provider Boundaries

`places` currently searches internal place records. Environment variables reserve future provider configuration:

- `PLACES_PROVIDER`
- `GOOGLE_PLACES_API_KEY`
- `MAPBOX_ACCESS_TOKEN`
- `OSM_GEOCODING_ENDPOINT`

Future Google Places, Mapbox, or OSM geocoding adapters should normalize external records into the `Place` contract before returning them. Controllers should not call provider SDKs directly.

`RouteSegment` stores provider, travel mode, from/to place IDs, route profile hash, encoded polyline, distance, duration, lifecycle timestamps, and JSON metadata for provider-specific details. Its uniqueness is provider + from place + to place + travel mode + route profile hash so Google, Mapbox, OSM, alternate routes, traffic-aware variants, and departure-time-sensitive variants can coexist. Route geometry is cacheable and reusable; it must not replace normalized place coordinates as the source of truth.

Comments use `targetEntityType` and `targetEntityId` rather than one nullable column per target type. This keeps comments extensible for itinerary items, expenses, notes, routes, and future collaboration entities without adding schema branches for each feature.

## 26. Realtime Preparation

Realtime collaboration should be added as a transport over the same domain services, not as a parallel write path.

Recommended future shape:

- Services emit trip mutation events after committed writes.
- Redis coordinates websocket fanout, route cache reuse, and presence.
- `clientMutationId` suppresses echo updates for the originating client.
- The frontend patches or invalidates granular React Query caches from realtime events.

Do not let websocket handlers bypass `TripsService.ensureCanEditTrip` or itinerary service validation.
