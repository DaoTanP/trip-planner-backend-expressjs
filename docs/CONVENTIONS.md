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
- `sendNoContent`

Do not call `res.json` directly in controllers unless adding a new response helper is clearly unnecessary for a one-off internal endpoint.

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

## 11. Logging Conventions

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

## 12. Async/Await Conventions

Use `asyncHandler` for async Express handlers.

```ts
router.post('/', validateRequest(schema), asyncHandler(controller.create));
```

Rules:

- Always `await` promises unless intentionally fire-and-forget.
- If intentionally fire-and-forget, use `void` and log errors inside the called function.
- Do not mix `.then()` chains with `async/await` without a specific reason.

## 13. TypeScript Conventions

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

## 14. Import Conventions

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

## 15. Testing Conventions

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

## 16. Redis Conventions

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

## 17. BullMQ Conventions

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

## 18. Docker Conventions

Docker must support:

- local hot reload
- Postgres with PostGIS
- Redis
- MailHog
- API and worker containers

Do not add required host services when Docker can provide them.

Do not put production secrets in Dockerfiles or compose files.

## 19. Environment Variable Conventions

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

## 20. Code Style Anti-Patterns To Avoid

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
