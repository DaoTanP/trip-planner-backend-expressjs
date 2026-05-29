# ADR 0009: Planner Workspace API Boundary

- Status: Accepted
- Date: 2026-05-29

## Context

The frontend planner is becoming a dense timeline/map workspace with derived grouping, route insights, selected-item notes, command palette actions, and mobile map overlays. These UX features could tempt the backend back toward nested editor payloads or backend-owned day/workspace grouping.

## Decision

Keep planner workspace behavior as frontend composition over normalized resources. The backend continues to expose trip metadata, flat itinerary items, places, route segments, notes, collaborators, expenses, and mutation events through granular APIs.

Do not add `TripDay`, nested planner workspace DTOs, backend-owned grouping responses, or map-provider-specific editor payloads. Add backend aggregation only when a calculation is expensive, permission-sensitive, or shared by multiple clients, and keep those responses normalized.

## Consequences

- The backend stays aligned with flat itinerary, route-first, optimistic, realtime-ready architecture.
- Web, mobile, and future offline clients can choose their own presentation grouping without schema churn.
- The planner UI can iterate quickly without forcing backend migrations for visual grouping or layout changes.
