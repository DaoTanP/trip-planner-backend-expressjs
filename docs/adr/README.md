# Architecture Decision Records

ADRs preserve architectural reasoning so future humans and AI agents understand why important choices were made.

## When To Write An ADR

Create an ADR when a decision:

- changes architecture
- introduces infrastructure
- adds a major dependency
- changes data modeling strategy
- changes authentication, authorization, or security posture
- creates a convention future contributors must follow
- has meaningful tradeoffs

Do not create ADRs for routine feature work.

## File Naming

Use this format:

```text
docs/adr/0001-short-kebab-case-title.md
docs/adr/0002-use-bullmq-for-background-jobs.md
```

Rules:

- Use a zero-padded four digit sequence.
- Never renumber existing ADRs.
- Use lowercase kebab-case titles.
- One decision per ADR.

## Status Values

Use one of:

- Proposed
- Accepted
- Superseded
- Deprecated

When superseding an ADR, link to the replacement ADR.
