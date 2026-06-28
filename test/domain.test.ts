import assert from "node:assert/strict";
import test from "node:test";
import { buildChecklist, normalizeApproval, normalizeIntakeRequest } from "../src/domain.ts";

test("normalizes valid intake requests", () => {
  const request = normalizeIntakeRequest({
    repository: "MSulSal/release-desk",
    title: "Add deploy note",
    requestedChange: "Update API contract and deploy config",
    testCommand: "npm test"
  });

  assert.equal(request.repository, "MSulSal/release-desk");
  assert.equal(request.testCommand, "npm test");
});

test("builds deterministic checklist items from request rules", () => {
  const checklist = buildChecklist({
    repository: "MSulSal/release-desk",
    title: "Update auth schema",
    requestedChange: "Change auth API schema and config handling",
    testCommand: "npm test"
  });

  assert.ok(checklist.length >= 5);
  assert.ok(checklist.some((item) => item.label.includes("authentication")));
  assert.ok(checklist.some((item) => item.label.includes("contract compatibility")));
  assert.ok(checklist.some((item) => item.label.includes("deploy and rollback")));
});

test("rejects invalid approval decisions", () => {
  assert.throws(() => normalizeApproval({ decision: "later" }), /approve or reject/);
});
