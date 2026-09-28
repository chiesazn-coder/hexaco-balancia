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
export function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error("Assessment operation failed", error instanceof Error ? error.name : "unknown");
  return json({ error: "Penyimpanan belum dapat dikonfirmasi. Tetap di halaman ini dan coba kembali." }, 503);
}
