# Architecture

```text
Web/API
  -> issue intake
  -> checklist rules
  -> approval state
  -> JSON request store
  -> audit log

Later slices
  -> test-run records
  -> review packet
  -> release decision history
```

## Boundaries

- Human approval is required before recording any release decision.
- Secrets, credentials, and production deploy tokens are out of scope.
- The service tracks workflow evidence; it does not merge or deploy code by itself.

## Current storage choice

The first runnable slice uses a JSON store to make the request lifecycle executable without introducing database setup ahead of the basic workflow. The API and event model are kept stable so a later PostgreSQL slice can replace storage without changing the request contract.
