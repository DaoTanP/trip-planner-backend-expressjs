# Trip Planner Backend

Production-grade Express + TypeScript foundation for a modular monolith Trip Planner API.

## Why This Architecture

This project uses a modular monolith because it gives a solo developer or small team clear ownership boundaries without microservice overhead. Each feature module owns its controller, service, repository, validation schemas, and types. Cross-cutting concerns live in `src/common`, runtime wiring lives in `src/config`, and background work lives in `src/jobs` and `src/workers`.

Controllers only translate HTTP. Services contain business rules. Repositories isolate Prisma. This keeps iteration fast while leaving room for AI itinerary generation, recommendations, realtime collaboration, file uploads, search, analytics, and worker-based jobs.

## Folder Structure

```text
src/
  app.ts
  server.ts
  routes.ts
  config/
    env.ts
    queue.ts
    redis.ts
  prisma/
    client.ts
  common/
    constants/
    errors/
    logger/
    middleware/
    storage/
    types/
    utils/
  modules/
    auth/
    users/
    trips/
    itinerary/
    places/
    notifications/
  jobs/
  workers/
prisma/
  schema.prisma
  seed.ts
  migrations/
tests/
  integration/
  setup.ts
```

## Package Dependencies

Runtime: Express, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, Zod, Pino, JWT, bcrypt, Helmet, CORS, rate limiting, AWS SDK v3 for S3-compatible object storage.

Development: Vitest, Supertest, ESLint flat config, Prettier, TSX, tsc-alias, Prisma CLI.

## Initial Setup

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Docker development works without copying `.env` first:

```bash
docker compose up --build
```

API base URL: `http://localhost:3000/api/v1`

MailHog UI: `http://localhost:8025`

## Docker Services

`docker-compose.yml` starts:

- `app`: Express API with hot reload
- `worker`: BullMQ worker with hot reload
- `postgres`: PostGIS-enabled PostgreSQL
- `redis`: cache, queue, rate-limit, and future realtime/session backing store
- `mailhog`: local email capture

## Prisma Setup

The schema models users, OAuth accounts, refresh tokens, trips, collaborators, destinations, itinerary days, activities, places, comments, and notifications.

PostgreSQL extensions enabled in the initial migration:

- `citext` for case-insensitive email uniqueness
- `pgcrypto` for database UUID generation
- `postgis` so geospatial support can be added later without changing infrastructure

Use relational modeling for ownership and collaboration. Use JSONB for flexible data such as preferences, booking info, metadata, source payloads, and future AI/recommendation context.

## REST API Surface

Implemented route groups:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /users/me`
- `PATCH /users/me`
- `GET /trips`
- `POST /trips`
- `GET /trips/:tripId`
- `PATCH /trips/:tripId`
- `DELETE /trips/:tripId`
- `GET /itinerary/trips/:tripId/days`
- `POST /itinerary/trips/:tripId/days`
- `POST /itinerary/days/:dayId/activities`
- `PATCH /itinerary/activities/:activityId`
- `DELETE /itinerary/activities/:activityId`
- `GET /places`
- `POST /places`
- `GET /notifications`
- `PATCH /notifications/:notificationId/read`

## Authentication

Auth uses JWT access tokens and refresh token rotation. Refresh tokens are hashed before persistence. Every refresh revokes the used token and issues a new one in the same token family. Reuse of a revoked token revokes the whole family.

The schema is ready for multi-device sessions, OAuth accounts, and email verification without coupling those concerns into trips or users.

## Error Handling

All API errors return a consistent shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed"
  }
}
```

Core error classes:

- `AppError`
- `ValidationError`
- `AuthError`
- `AuthorizationError`
- `NotFoundError`
- `ConflictError`

## Logging

Pino is configured for structured logs, request logging, redaction of secrets, and pretty local development output. Production logs stay JSON for container platforms.

## Redis And BullMQ

Redis is wrapped in `src/config/redis.ts` and currently supports cache helpers plus rate limiting. BullMQ connection and defaults are centralized in `src/config/queue.ts`, with a notification queue and worker as the first background job boundary.

## Environment Variables

Use `.env.example` as the source of truth. Required production values include:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`

S3-compatible storage is configured through endpoint, region, bucket, access key, secret, and path-style options. This supports AWS S3, MinIO, R2, and other compatible providers behind the same interface.

## Coding Conventions

- Keep module business logic in services.
- Keep Prisma access in repositories.
- Keep controllers thin.
- Validate all request inputs with Zod at route boundaries.
- Prefer small module-local helpers over broad shared utilities.
- Add shared code only when at least two modules genuinely need it.
- Use path aliases from `@/*` and keep imports explicit.
- Avoid circular dependencies between modules.

## Development Workflow

```bash
npm run dev              # API hot reload
npm run worker:dev       # worker hot reload
npm run typecheck
npm run lint
npm run test
npm run prisma:migrate
npm run prisma:seed
```

For integration tests that need a real database, point `DATABASE_URL` at an isolated test database and run migrations before the test suite. Keep integration tests focused on user-facing workflows instead of unit-testing trivial pass-through functions.
