import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { normalizeApproval, normalizeIntakeRequest } from "./domain.ts";
import { getTraceId, writeStructuredLog } from "./logger.ts";
import { JsonReleaseDeskStore } from "./store.ts";

type JsonBody = Record<string, unknown>;

export function createApp(store: JsonReleaseDeskStore) {
  return createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const headers = new Headers(request.headers as Record<string, string>);
    const traceId = getTraceId(headers);

    response.setHeader("content-type", "application/json");
    response.setHeader("x-trace-id", traceId);

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, { status: "ok", service: "release-desk" });
      }

      if (request.method === "GET" && url.pathname === "/ready") {
        return sendJson(response, 200, { status: "ready", store: await store.health() });
      }

      if (request.method === "POST" && url.pathname === "/requests") {
        const body = normalizeIntakeRequest(await readJsonBody(request));
        const created = await store.createRequest({
          ...body,
          traceId,
          now: new Date().toISOString()
        });

        writeStructuredLog("request.created", {
          traceId,
          requestId: created.workRequest.id,
          approvalState: created.workRequest.approvalState,
          checklistCount: created.workRequest.checklist.length
        });

        return sendJson(response, 201, created);
      }

      const requestMatch = url.pathname.match(/^\/requests\/([^/]+)$/);
      if (request.method === "GET" && requestMatch) {
        const found = await store.findRequest(requestMatch[1]);
        if (!found) {
          return sendJson(response, 404, { error: "request not found", traceId });
        }

        return sendJson(response, 200, found);
      }

      const approvalMatch = url.pathname.match(/^\/requests\/([^/]+)\/approval$/);
      if (request.method === "POST" && approvalMatch) {
        const approval = normalizeApproval(await readJsonBody(request));
        const recorded = await store.recordApproval({
          requestId: approvalMatch[1],
          approval,
          traceId,
          now: new Date().toISOString()
        });

        writeStructuredLog("approval.recorded", {
          traceId,
          requestId: recorded.workRequest.id,
          approvalState: recorded.workRequest.approvalState
        });

        return sendJson(response, 200, recorded);
      }

      return sendJson(response, 404, { error: "route not found", traceId });
    } catch (error) {
      writeStructuredLog("request.failed", {
        traceId,
        path: url.pathname,
        error: (error as Error).message
      });
      const status = (error as Error).message === "request not found" ? 404 : 400;
      return sendJson(response, status, { error: (error as Error).message, traceId });
    }
  });
}

async function readJsonBody(request: IncomingMessage): Promise<JsonBody> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as JsonBody;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.end(JSON.stringify(body));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4321);
  const dataPath =
    process.env.RELEASE_DESK_DATA_PATH ?? fileURLToPath(new URL("../data/release-desk.json", import.meta.url));
  const store = new JsonReleaseDeskStore(dataPath);
  const app = createApp(store);
  app.listen(port, () => {
    writeStructuredLog("service.started", { port, dataPath });
  });
}
