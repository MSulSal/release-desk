import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  type ApprovalInput,
  type AuditEvent,
  createWorkRequest,
  type WorkRequest
} from "./domain.ts";

type StoreData = {
  requests: WorkRequest[];
  auditEvents: AuditEvent[];
};

const emptyStore: StoreData = {
  requests: [],
  auditEvents: []
};

export class JsonReleaseDeskStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async health(): Promise<{ ok: true; requestCount: number; auditEventCount: number }> {
    const data = await this.read();
    return {
      ok: true,
      requestCount: data.requests.length,
      auditEventCount: data.auditEvents.length
    };
  }

  async createRequest(input: {
    repository: string;
    title: string;
    requestedChange: string;
    testCommand: string;
    traceId: string;
    now: string;
  }): Promise<{ workRequest: WorkRequest; auditEvents: AuditEvent[] }> {
    const data = await this.read();
    const created = createWorkRequest(input, input.traceId, input.now);
    data.requests.push(created.workRequest);
    data.auditEvents.push(...created.auditEvents);
    await this.write(data);
    return created;
  }

  async recordApproval(input: {
    requestId: string;
    approval: ApprovalInput;
    traceId: string;
    now: string;
  }): Promise<{ workRequest: WorkRequest; auditEvent: AuditEvent }> {
    const data = await this.read();
    const workRequest = data.requests.find((candidate) => candidate.id === input.requestId);

    if (!workRequest) {
      throw new Error("request not found");
    }

    if (workRequest.approvalState !== "pending") {
      throw new Error("approval already recorded");
    }

    workRequest.approvalState = input.approval.decision === "approve" ? "approved" : "rejected";
    workRequest.reviewedAt = input.now;
    workRequest.reviewerNote = input.approval.note;

    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      requestId: workRequest.id,
      type: "APPROVAL_RECORDED",
      at: input.now,
      traceId: input.traceId,
      details: {
        approvalState: workRequest.approvalState,
        note: input.approval.note ?? null
      }
    };

    data.auditEvents.push(auditEvent);
    await this.write(data);
    return { workRequest, auditEvent };
  }

  async findRequest(requestId: string): Promise<{ workRequest: WorkRequest; auditEvents: AuditEvent[] } | null> {
    const data = await this.read();
    const workRequest = data.requests.find((candidate) => candidate.id === requestId);
    if (!workRequest) {
      return null;
    }

    return {
      workRequest,
      auditEvents: data.auditEvents.filter((event) => event.requestId === requestId)
    };
  }

  private async read(): Promise<StoreData> {
    try {
      return JSON.parse(await readFile(this.filePath, "utf8")) as StoreData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return structuredClone(emptyStore);
      }
      throw error;
    }
  }

  private async write(data: StoreData): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }
}
