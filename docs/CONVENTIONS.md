# Conventions

This document is the coding constitution for the Trip Planner backend. It exists to keep human-written and AI-generated code consistent.

## 1. Naming Conventions

Files:

- Use kebab-case for common files: `error-handler.middleware.ts`.
- Use module prefix for module files: `trips.service.ts`, `auth.repository.ts`.
- Test files end with `.test.ts`.

Folders:

- Use plural domain names for modules: `users`, `trips`, `places`.
- Use singular technical folders: `config`, `prisma`.

Classes:

- Use PascalCase.
- Suffix by role: `TripsService`, `AuthRepository`, `UsersController`.

Types and interfaces:

- Use PascalCase.
- Prefer `type` for data shapes.
- Use `interface` only when declaration merging or class contracts are useful.

Enums:

- Use PascalCase enum names and uppercase values in Prisma.

Constants:

- Use uppercase for shared constants: `HTTP_STATUS`, `QUEUE_NAMES`.
- Use camelCase for local constants.

Environment variables:

- Use uppercase snake case: `DATABASE_URL`, `JWT_ACCESS_SECRET`.
- Add every variable to `.env.example` and `src/config/env.ts`.

## 2. Folder Conventions

Module folder:

```text
src/modules/<module>/
  <module>.controller.ts
  <module>.service.ts
  <module>.repository.ts
  <module>.schemas.ts
  <module>.routes.ts
  <module>.types.ts      # optional
```

Do not create unrelated folders inside a module unless the module has real complexity.

Allowed shared folders:

```text
src/common/errors
src/common/logger
src/common/localization
src/common/middleware
src/common/storage
src/common/types
src/common/utils
```

`common/utils` must stay small. Prefer module-local helpers.

## 3. Module Structure Conventions

Every API module should have:

- routes for URL mapping
- schemas for Zod validation
- controller for HTTP translation
- service for business logic
- repository for Prisma access

Allowed:

```text
routes -> controller -> service -> repository
```

Forbidden:

```text
routes -> repository
controller -> prisma
service -> express Response
repository -> service
```

## 4. Controller Conventions

Controllers must:

- read validated request data
- read `req.user` when authentication is required
- call one service method
- return through response helpers

Controllers must not:

- call Prisma
- perform password hashing
- contain permission rules
- open transactions
- enqueue jobs directly unless the endpoint is explicitly a job enqueue API
- format errors manually

Allowed:

```ts
get = async (req: Request<TripIdParams>, res: Response) => {
  const trip = await this.service.getTrip(requireUserId(req), req.params.tripId);
  return sendSuccess(res, { trip });
};
```

Forbidden:

```ts
const trip = await prisma.trip.findUnique({ where: { id: req.params.tripId } });
res.json(trip);
```

## 5. Service Conventions

Services must:

- own business logic
- enforce permissions
- coordinate repositories
- coordinate queues
- use transactions for atomic multi-write workflows
- throw typed application errors

Services must not:

- import Express `Request` or `Response`
- return HTTP status codes
- know route paths
- expose raw third-party provider details unless intentional

Transaction rule:

```ts
await prisma.$transaction(async (tx) => {
  // all writes needed for one invariant
});
```

Use transactions when partial completion would violate a domain rule.

## 6. Repository Conventions

Repositories are the only normal place for Prisma queries.

Repositories should:

- accept explicit parameters
- return Prisma model records or typed query results
- use `include` and `select` intentionally
- keep query names domain-readable

Repositories must not:

- enforce user permissions
- call queues
- call services
- format API responses
- swallow errors unless converting a known persistence condition

Allowed:

```ts
findAccess(tripId: string, userId: string) {
  return prisma.trip.findFirst({ where: { id: tripId, ownerId: userId } });
}
```

Forbidden:

```ts
if (req.user.role !== 'ADMIN') throw new AuthorizationError();
```

## 7. DTO And Validation Conventions

Use Zod schemas as the source of input DTO types.

```ts
export const createTripSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(180)
  })
});

export type CreateTripInput = z.infer<typeof createTripSchema>['body'];
```

Do not duplicate DTO types manually when they can be inferred.

## 8. Zod Validation Conventions

Validate `body`, `params`, and `query` at route boundaries.

Rules:

- Trim user-provided strings when appropriate.
- Normalize emails to lowercase.
- Use `.uuid()` for UUID route params.
- Use `.datetime()` for timestamps.
- Use a date-only regex for `YYYY-MM-DD` values.
- Keep database-state validation in services.

Forbidden:

```ts
const { title } = req.body as any;
```

## 9. API Response Conventions

All success responses use:

```json
{
  "success": true,
  "data": {}
}
```

Pagination goes in `meta`.

```json
{
  "success": true,
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

Use:

- `sendSuccess`
- `sendCreated`
- `sendPaginated`
- `sendNoContent`

Do not call `res.json` directly in controllers unless adding a new response helper is clearly unnecessary for a one-off internal endpoint.

API DTOs that cross repository boundaries must be represented in `src/api/contracts/v1.ts`. Controllers should serialize Prisma records into DTOs before returning them; do not expose raw Prisma records when the record shape contains relations, dates, decimals, or fields not documented in the API contract.

List responses should use `data` for the array and `meta.pagination` for pagination:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

## 10. Error Handling Conventions

Throw typed errors:

- `ValidationError`
- `AuthError`
- `AuthorizationError`
- `NotFoundError`
- `ConflictError`
- `AppError`

Do not return errors manually from controllers.

Allowed:

```ts
if (!trip) {
  throw new NotFoundError('Trip');
}
```

Forbidden:

```ts
return res.status(404).json({ message: 'missing' });
```

## 11. Localization Conventions

Use localization keys for user-facing text that can leave the backend through API errors, validation details, notifications, or email templates.

Rules:

- Services throw typed errors with `messageKey` and parameters instead of hardcoded prose.
- Zod custom messages should be catalog keys such as `validation.dateOnly`.
- Shared scalar validators for locale, timezone, and date-only strings live in `src/common/localization/schemas.ts`.
- Request locale comes from `localeMiddleware`; do not parse `Accept-Language` inside controllers or services.
- Module-specific notification and email templates belong to the module that owns the event.
- Persist user locale and timezone on `User`; use `UsersService` to read another user's preferences.

Forbidden:

```ts
throw new ConflictError('Email is already registered');
```

Allowed:

```ts
throw new ConflictError({ messageKey: 'errors.conflict.emailRegistered' });
```

## 12. Logging Conventions

Use the shared Pino logger.

Allowed:

```ts
logger.info({ tripId, userId }, 'Trip created');
```

Forbidden:

```ts
console.log('created', trip);
```

Never log:

- passwords
- raw access tokens
- raw refresh tokens
- cookies
- authorization headers
- full secret-bearing provider payloads

## 12a. Auth And OAuth Conventions

- Provider verification belongs in `src/modules/auth/providers`.
- Controllers must not verify OAuth credentials, create users, or link accounts directly.
- Auth services own account linking, auto-registration, disabled-account checks, and token issuance.
- Repositories own `User`, `OAuthAccount`, and `RefreshToken` persistence for auth workflows.
- New OAuth providers must store provider identifiers in `OAuthAccount`, not provider-specific columns on `User`.
- Browser sessions should use httpOnly cookies plus CSRF headers; do not add `localStorage`-based refresh-token flows for the web app.
- OAuth provider profile payloads belong in `OAuthAccount.profile` and must not include provider access tokens unless a future feature explicitly requires encrypted storage.

## 13. Async/Await Conventions

Use `asyncHandler` for async Express handlers.

```ts
router.post('/', validateRequest(schema), asyncHandler(controller.create));
```

Rules:

- Always `await` promises unless intentionally fire-and-forget.
- If intentionally fire-and-forget, use `void` and log errors inside the called function.
- Do not mix `.then()` chains with `async/await` without a specific reason.

## 14. TypeScript Conventions

Strict TypeScript is required.

Rules:

- Avoid `any`.
- Use `unknown` for untrusted data.
- Prefer inferred return types for simple private helpers.
- Use explicit return types for exported functions and public service methods when helpful.
- Use `import type` for type-only imports.
- Respect `exactOptionalPropertyTypes`.

Forbidden:

```ts
function handle(input: any) {}
```

Allowed:

```ts
function handle(input: unknown) {
  const parsed = schema.parse(input);
}
```

## 15. Import Conventions

Use path aliases for project imports:

```ts
import { logger } from '@/common/logger/logger.js';
```

Import order:

1. Node built-ins
2. External packages
3. Internal aliases
4. Relative imports, only when same-folder is clearer

Use `.js` extensions for TypeScript source imports because the project uses NodeNext ESM.

## 16. Testing Conventions

Prefer integration tests for user-facing behavior.

Test:

- request validation
- auth flows
- permission checks
- repository-backed workflows
- error response shapes

Avoid testing:

- trivial getters
- pass-through controllers without behavior
- implementation details that should freely change

Test files:

```text
tests/integration/<feature>.test.ts
```

## 17. Redis Conventions

Use `src/config/redis.ts`.

Allowed:

```ts
await cache.set(cacheKey, value, 60);
```

Forbidden:

```ts
createClient({ url: process.env.REDIS_URL });
```

Cache keys must be namespaced:

```text
places:list:<hash-or-query>
trip:<tripId>:summary
```

Set a TTL for cached data unless it is intentionally persistent.

## 18. BullMQ Conventions

Queue names live in `src/jobs/queue-names.ts`.

Queue payloads must be typed.

```ts
export type NotificationJobData = {
  notificationId: string;
  userId: string;
};
```

Workers must:

- log job start and failure
- be idempotent where possible
- use retry settings from shared queue config
- not depend on Express request state

## 19. Docker Conventions

Docker must support:

- Node.js 24.15.0 LTS using official Node Alpine images
- local hot reload
- Postgres with PostGIS
- Redis
- Mailpit
- API and worker containers

Use committed lockfiles and `npm ci` in Docker builds. Do not install dependencies on every container startup; rebuild the dev image after dependency changes.

Do not add required host services when Docker can provide them.

Do not put production secrets in Dockerfiles or compose files.

## 20. Environment Variable Conventions

Every environment variable must be defined in:

- `.env.example`
- `src/config/env.ts`
- deployment configuration

Rules:

- Parse env vars once in `src/config/env.ts`.
- Do not read `process.env` throughout modules.
- Validate required secrets on startup.
- Use safe local defaults only for development.

Forbidden:

```ts
const secret = process.env.JWT_SECRET!;
```

Allowed:

```ts
import { env } from '@/config/env.js';
const secret = env.JWT_ACCESS_SECRET;
```

## 21. Code Style Anti-Patterns To Avoid

- Giant controllers.
- Giant services.
- A global `helpers.ts` file.
- `any` as a shortcut.
- Business rules hidden in repositories.
- Prisma access outside repositories.
- Copy-pasted validation rules.
- Inconsistent response shapes.
- Manual try/catch in every controller.
- Circular module imports.
- New dependencies for tiny problems.
- Premature abstractions.
- Mixing unrelated features in one module.
- Silent catch blocks.
- Unbounded Redis keys without TTL.
- Jobs that are not safe to retry.

## 22. Trip Editor API Conventions

- Trip detail responses must be serialized through API serializers, not returned as raw Prisma graphs.
- Reorder endpoints must run in transactions.
- Reorder services must validate that every day/item in the payload belongs to the target trip.
- Use `TripDay` and `ItineraryItem` naming in new code. Compatibility aliases may exist temporarily, but new API contracts should use editor-facing names.
- Use `clientMutationId` on reorder APIs when a frontend interaction may also receive a future realtime event.
- Keep place provider integration behind `places.service.ts` or provider adapters. Controllers must not call Google, Mapbox, or OSM directly.
- Add new trip editor environment variables to `.env.example`, `docker-compose.yml`, and `src/config/env.ts`.
