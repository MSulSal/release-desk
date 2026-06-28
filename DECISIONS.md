# Decisions

## Current slice

- Release Desk accepts a work request through an HTTP API.
- The request stores repository, title, requested change, test command, approval state, checklist items, and audit events.
- Checklist generation is deterministic and rule-based.
- Approval is a separate action and starts in `pending`.
- Structured logs and `x-trace-id` connect requests to the audit trail.

## Current limits

- Test-run capture is not implemented yet.
- Review packets are not implemented yet.
- Release decisions stop at approval state; there is no deployment integration.
- The local JSON adapter is a temporary storage layer for the first slice.

## Storage tradeoff

The first slice uses a local JSON adapter so the workflow is runnable immediately. A later slice can replace it with PostgreSQL without changing the HTTP contract.
