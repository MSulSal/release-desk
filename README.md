# Release Desk

Release Desk is a developer workflow service for turning a requested code change into a tracked implementation plan, test run, review packet, and explicit human release decision.

## Current Status

The first runnable slice is implemented:

- HTTP intake API for work requests.
- Deterministic checklist generation.
- Local JSON storage for requests and audit events.
- Human approval state and approval endpoint.
- Health and readiness endpoints.
- Structured logs and trace IDs.
- Node test coverage for success and failure paths.

## Product Boundaries

- No autonomous merge.
- No credential or secret access.
- No production deployment without explicit approval.
- Every proposed change must be tied to a test result and review record.

## First Slice

1. Create a local issue intake API.
2. Store repository context, requested change, test command, and review status.
3. Generate a deterministic implementation checklist from configured rules.
4. Require a human approval state before any release action can be recorded.
5. Expose an audit trail for request, test, review, and release-decision events.

## Run

```powershell
npm test
npm start
```

The service listens on `http://127.0.0.1:4321`.
