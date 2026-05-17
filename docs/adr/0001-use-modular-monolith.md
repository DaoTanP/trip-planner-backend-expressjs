# ADR 0001: Use Modular Monolith

## Status

Accepted

## Context

The Trip Planner backend is built for a solo developer or small team. It needs clear domain boundaries, fast iteration, simple local development, and long-term maintainability. The product may later add AI itinerary generation, recommendations, realtime collaboration, file uploads, notifications, search, and analytics.

Microservices would add deployment, networking, observability, data consistency, and operational overhead before the product needs those tradeoffs.

## Decision

We will build the backend as a modular monolith.

Each business capability lives in `src/modules/<module>`, with controller, service, repository, validation schemas, routes, and optional types. Cross-cutting infrastructure lives in `src/common`, `src/config`, `src/jobs`, and `src/workers`.

## Consequences

Positive consequences:

- Simple local development with Docker Compose.
- Clear module boundaries without distributed system overhead.
- Faster refactoring while the product is still evolving.
- Easier onboarding for humans and AI agents.
- Shared database transactions remain straightforward.

Negative consequences:

- All modules deploy together.
- Poor module boundaries can still create coupling if rules are ignored.
- Scaling is initially at the app and worker level, not per microservice.

Operational consequences:

- Run more API containers for HTTP scale.
- Run more worker containers for background throughput.
- Keep API containers stateless.

## Alternatives Considered

### Microservices

Description:

- Split auth, trips, itinerary, notifications, and recommendations into separate services.

Why not chosen:

- Too much operational overhead for the team size and product stage.
- Data consistency and local development would become harder.
- Boundaries are not stable enough yet.

### Traditional MVC

Description:

- Organize all controllers, services, and models in global folders.

Why not chosen:

- It becomes difficult to understand feature ownership as the codebase grows.
- AI-generated code is more likely to place logic in inconsistent locations.

## Tradeoffs

The modular monolith favors maintainability, speed, and consistency over independent service deployment. This is the right tradeoff until the product has proven scaling pressure and stable organizational boundaries.

## Future Considerations

Revisit this decision if:

- one module needs independent deployment cadence
- one module has radically different scaling needs
- team ownership splits by domain
- operational maturity justifies distributed systems overhead
