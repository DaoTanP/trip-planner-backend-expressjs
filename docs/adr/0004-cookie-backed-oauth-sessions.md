# 0004 Cookie-Backed OAuth Sessions

## Status

Accepted

## Context

The backend must support Google login now and future providers such as GitHub, Apple, and magic links without moving authentication trust into the frontend. The frontend also needs SSR-safe route protection and Docker-friendly local development.

## Decision

Keep the backend as the authentication source of truth. The frontend may send a Google credential, but the backend verifies it with the Google verifier, links or creates the user through `OAuthAccount`, and issues the app session.

Browser sessions use httpOnly access and refresh cookies plus a readable CSRF cookie. Access tokens remain short-lived. Refresh tokens are rotated, hashed at rest, and grouped by token family for reuse detection. `AUTH_TOKEN_TRANSPORT` allows body-token responses for non-browser clients, cookie-only responses for the web app, or both during migration.

OAuth providers live behind `src/modules/auth/providers/*` interfaces. Controllers stay thin; services own account linking, auto-registration, disabled-account checks, and token issuance.

## Consequences

- Future providers can reuse the same account-linking and token issuance flow.
- The frontend can validate SSR sessions through `GET /auth/me`.
- Cross-site production deployments must configure cookie domain, same-site, secure flags, CORS, and CSRF deliberately.
- Provider profile metadata is stored on `OAuthAccount.profile`; provider access tokens are not stored by default.
- The Prisma schema keeps provider identity separate from `User`, preserving room for multi-account and multi-device sessions.
