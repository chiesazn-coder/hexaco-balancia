import "server-only";
import { adminAuth } from "./firebase-admin";
import { isTestId } from "../assessment/validation";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function authenticate(request: Request, test: string) {
  if (!isTestId(test)) throw new HttpError(404, "Tes tidak ditemukan.");
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new HttpError(401, "Silakan masuk kembali.");
  try { return { identity: await adminAuth().verifyIdToken(token, true), test }; }
  catch { throw new HttpError(401, "Sesi tidak valid. Silakan masuk kembali."); }
}
export async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Data tidak tersedia.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 64000) { await reader.cancel(); throw new HttpError(413, "Data terlalu besar."); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new HttpError(400, "Format data tidak valid."); }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
// One JSON line per failed request so it can be searched in Vercel Logs ("assessment_request_failed").
// Never includes names, emails or answers; uid lets support match a candidate's report.
export type RouteContext = { action: "submit" | "progress"; method: string; test: string; uid?: string; startedAt: number };
export const routeContext = (action: RouteContext["action"], request: Request, test: string): RouteContext =>
  ({ action, method: request.method, test, startedAt: Date.now() });

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) return { errorName: typeof error };
  const code = (error as { code?: unknown }).code;
  return {
    errorName: error.name,
    ...(typeof code === "string" || typeof code === "number" ? { errorCode: code } : {}),
    errorMessage: error.message.slice(0, 300),
  };
}

// gRPC 8 / "resource-exhausted": Firestore quota (Spark plan) or rate limit.
const isQuotaError = (error: unknown) => {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 8 || code === "resource-exhausted" || /RESOURCE_EXHAUSTED|quota/i.test(error instanceof Error ? error.message : "");
};

export function failure(error: unknown, context?: RouteContext) {
  const expected = error instanceof HttpError;
  const status = expected ? error.status : 503;
  const log = {
    event: "assessment_request_failed",
    ...(context ? { action: context.action, method: context.method, test: context.test, uid: context.uid ?? null, durationMs: Date.now() - context.startedAt } : {}),
    status,
    ...(expected ? { reason: error.message } : { ...errorDetails(error), ...(isQuotaError(error) ? { hint: "firestore_quota" } : {}) }),
  };
  (expected ? console.warn : console.error)(JSON.stringify(log));
  if (expected) return json({ error: error.message }, error.status);
  return json({ error: "Penyimpanan belum dapat dikonfirmasi. Tetap di halaman ini dan coba kembali." }, 503);
}
