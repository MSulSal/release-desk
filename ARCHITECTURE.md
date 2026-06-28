# Architecture

```text
Web/API
  -> issue intake
  -> checklist rules
  -> test-run records
  -> review packet
  -> release decision
  -> audit log
```

## Boundaries

- Human approval is required before recording any release decision.
- Secrets, credentials, and production deploy tokens are out of scope.
- The service tracks workflow evidence; it does not merge or deploy code by itself.
