# Runbook

## Local start

```powershell
cd proof-projects/live/release-desk
npm test
npm start
```

The service listens on `http://127.0.0.1:4321`.

## Smoke test

```powershell
$body = @{
  repository = "MSulSal/release-desk"
  title = "Track release checklist"
  requestedChange = "Update auth API schema and deploy config"
  testCommand = "npm test"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4321/requests -Body $body -ContentType "application/json" -Headers @{ "x-request-id" = "manual-release-1" }
```

Expected result:

- HTTP 201.
- `approvalState` is `pending`.
- A deterministic checklist is attached to the request.
- Three audit events are written for intake, checklist generation, and pending approval.

## Record approval

```powershell
$body = @{ decision = "approve"; note = "review packet complete" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4321/requests/<request-id>/approval -Body $body -ContentType "application/json"
```

## Failure path

Send an intake request with an empty `repository`, `title`, `requestedChange`, or `testCommand`. The API returns HTTP 400 and does not create a work request or audit event.
