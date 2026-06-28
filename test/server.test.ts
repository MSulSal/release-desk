import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApp } from "../src/server.ts";
import { JsonReleaseDeskStore } from "../src/store.ts";

test("creates a request, records checklist and approval, and reads the audit trail", async (t) => {
  const baseDir = await mkdtemp(join(tmpdir(), "release-desk-"));
  const store = new JsonReleaseDeskStore(join(baseDir, "release-desk.json"));
  const app = createApp(store);

  await new Promise<void>((resolve) => app.listen(0, resolve));
  t.after(() => app.close());

  const address = app.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const createResponse = await fetch(`${baseUrl}/requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": "release-trace-1"
    },
    body: JSON.stringify({
      repository: "MSulSal/release-desk",
      title: "Track deploy config update",
      requestedChange: "Update auth API schema and deploy config",
      testCommand: "npm test"
    })
  });

  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.headers.get("x-trace-id"), "release-trace-1");
  const created = await createResponse.json();
  assert.equal(created.workRequest.approvalState, "pending");
  assert.equal(created.auditEvents.length, 3);
  assert.ok(created.workRequest.checklist.length >= 5);

  const approvalResponse = await fetch(`${baseUrl}/requests/${created.workRequest.id}/approval`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision: "approve", note: "ready for reviewer handoff" })
  });

  assert.equal(approvalResponse.status, 200);
  const approved = await approvalResponse.json();
  assert.equal(approved.workRequest.approvalState, "approved");
  assert.equal(approved.auditEvent.type, "APPROVAL_RECORDED");

  const readResponse = await fetch(`${baseUrl}/requests/${created.workRequest.id}`);
  assert.equal(readResponse.status, 200);
  const found = await readResponse.json();
  assert.equal(found.auditEvents.length, 4);
});

test("rejects invalid intake without writing store state", async (t) => {
  const baseDir = await mkdtemp(join(tmpdir(), "release-desk-"));
  const store = new JsonReleaseDeskStore(join(baseDir, "release-desk.json"));
  const app = createApp(store);

  await new Promise<void>((resolve) => app.listen(0, resolve));
  t.after(() => app.close());

  const address = app.address();
  assert.equal(typeof address, "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const response = await fetch(`${baseUrl}/requests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      repository: "",
      title: "Bad request",
      requestedChange: "Missing repository",
      testCommand: "npm test"
    })
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /repository must be a non-empty string/);

  const readiness = await fetch(`${baseUrl}/ready`);
  const readinessBody = await readiness.json();
  assert.equal(readinessBody.store.requestCount, 0);
  assert.equal(readinessBody.store.auditEventCount, 0);
});
