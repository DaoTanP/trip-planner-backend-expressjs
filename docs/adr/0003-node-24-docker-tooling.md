# ADR 0003: Node 24 Docker Tooling Baseline

## Status

Accepted

## Context

The backend runs inside Docker and targets long-term development on Node.js 24.15.0 LTS. The previous Dockerfiles used Node 22 and allowed install behavior to vary depending on whether a lockfile existed.

## Decision

- Use official `node:24.15.0-alpine3.23` images for backend development and production builds.
- Require a committed `package-lock.json` and use `npm ci` in Docker.
- Keep Prisma on the latest 6.x line for now and move CLI configuration into `prisma.config.ts`.
- Keep Zod on 3.x until a deliberate validation migration is scheduled.
- Use Mailpit instead of MailHog for local SMTP capture.

## Consequences

- Docker builds are more reproducible and cache better.
- CI should use Node 24.15.0 and npm 11.14.1, then run `npm ci`, `npm run prisma:generate`, `npm run typecheck`, `npm run lint`, and `npm run test`.
- Prisma 7 and Zod 4 remain planned major migrations rather than incidental dependency drift.
- Developers should rebuild the dev image after dependency changes.
