# ADR 0002: Shared Localization Boundary

## Status

Accepted

## Context

The backend needs future localization support for validation messages, notification templates, email templates, user locale preferences, and timezone-aware date handling. The system is a modular monolith, so localization should be shared where it is cross-cutting without moving module-specific language into a global service.

## Decision

- Keep locale negotiation, message catalogs, translators, and shared locale/timezone validators in `src/common/localization`.
- Store user `locale` and `timezone` directly on `User`.
- Translate Zod validation issues in request validation middleware.
- Translate typed operational errors in the global error handler.
- Keep notification and notification-email templates in the notifications module, using shared translation primitives.
- Store UTC instants while preserving timezone fields for user-facing formatting.

## Consequences

- Business services pass message keys and parameters instead of hardcoded prose.
- Adding a locale requires extending the shared catalog for all existing keys.
- Module-specific templates remain close to the module that owns the event.
- Future email delivery can reuse notification email templates without introducing a separate service prematurely.
