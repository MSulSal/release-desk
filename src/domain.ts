import { randomUUID } from "node:crypto";

export type ApprovalState = "pending" | "approved" | "rejected";
export type ChecklistStatus = "pending" | "complete";

export type IntakeRequestInput = {
  repository: string;
  title: string;
  requestedChange: string;
  testCommand: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  reason: string;
};

export type WorkRequest = {
  id: string;
  repository: string;
  title: string;
  requestedChange: string;
  testCommand: string;
  approvalState: ApprovalState;
  checklist: ChecklistItem[];
  createdAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
  traceId: string;
};

export type AuditEvent = {
  id: string;
  requestId: string;
  type:
    | "REQUEST_RECEIVED"
    | "CHECKLIST_GENERATED"
    | "APPROVAL_PENDING"
    | "APPROVAL_RECORDED";
  at: string;
  traceId: string;
  details: Record<string, unknown>;
};

export type ApprovalInput = {
  decision: "approve" | "reject";
  note?: string;
};

export function normalizeIntakeRequest(input: Record<string, unknown>): IntakeRequestInput {
  const repository = requireNonEmptyString(input.repository, "repository");
  const title = requireNonEmptyString(input.title, "title");
  const requestedChange = requireNonEmptyString(input.requestedChange, "requestedChange");
  const testCommand = requireNonEmptyString(input.testCommand, "testCommand");

  return { repository, title, requestedChange, testCommand };
}

export function normalizeApproval(input: Record<string, unknown>): ApprovalInput {
  const decision = input.decision;
  if (decision !== "approve" && decision !== "reject") {
    throw new Error("decision must be approve or reject");
  }

  const note = typeof input.note === "string" ? input.note.trim() : undefined;
  return { decision, note: note || undefined };
}

export function buildChecklist(input: IntakeRequestInput): ChecklistItem[] {
  const rules = [
    {
      label: "Confirm scope and touched components",
      reason: "Every request needs a scoped implementation target.",
      when: () => true
    },
    {
      label: `Run requested verification command: ${input.testCommand}`,
      reason: "Every proposed change must be tied to a test result.",
      when: () => true
    },
    {
      label: "Prepare review summary with changed files and risks",
      reason: "Release approval depends on a reviewer packet.",
      when: () => true
    },
    {
      label: "Inspect authentication, authorization, or secret handling impact",
      reason: "Auth-related requests need an explicit security pass.",
      when: () => includesAny(input.requestedChange, ["auth", "token", "secret", "credential", "permission"])
    },
    {
      label: "Review contract compatibility and rollout notes",
      reason: "API and schema changes can break downstream consumers.",
      when: () => includesAny(input.requestedChange, ["api", "schema", "contract", "migration"])
    },
    {
      label: "Document deploy and rollback checkpoints",
      reason: "Operational changes need a release decision trail.",
      when: () => includesAny(input.requestedChange, ["deploy", "release", "config", "infra"])
    }
  ];

  return rules
    .filter((rule) => rule.when())
    .map((rule) => ({
      id: randomUUID(),
      label: rule.label,
      status: "pending",
      reason: rule.reason
    }));
}

export function createWorkRequest(input: IntakeRequestInput, traceId: string, now: string): {
  workRequest: WorkRequest;
  auditEvents: AuditEvent[];
} {
  const workRequest: WorkRequest = {
    id: randomUUID(),
    repository: input.repository,
    title: input.title,
    requestedChange: input.requestedChange,
    testCommand: input.testCommand,
    approvalState: "pending",
    checklist: buildChecklist(input),
    createdAt: now,
    traceId
  };

  const auditEvents: AuditEvent[] = [
    {
      id: randomUUID(),
      requestId: workRequest.id,
      type: "REQUEST_RECEIVED",
      at: now,
      traceId,
      details: {
        repository: workRequest.repository,
        title: workRequest.title
      }
    },
    {
      id: randomUUID(),
      requestId: workRequest.id,
      type: "CHECKLIST_GENERATED",
      at: now,
      traceId,
      details: {
        itemCount: workRequest.checklist.length,
        labels: workRequest.checklist.map((item) => item.label)
      }
    },
    {
      id: randomUUID(),
      requestId: workRequest.id,
      type: "APPROVAL_PENDING",
      at: now,
      traceId,
      details: {
        approvalState: workRequest.approvalState
      }
    }
  ];

  return { workRequest, auditEvents };
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }

  return value.trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  const normalized = haystack.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}
