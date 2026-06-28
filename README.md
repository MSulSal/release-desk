# Release Desk

Release Desk is a developer workflow service for turning a requested code change into a tracked implementation plan, test run, review packet, and explicit human release decision.

## Current Status

This repository starts with the product contract and first implementation target. Runtime code will be added in small, testable slices.

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
