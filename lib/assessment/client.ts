"use client";
import { auth } from "../firebase";
import type { KraepelinScore } from "../kraepelin/scorer";
import type { TestId } from "./validation";

const prefixes: Record<TestId, string> = { ist: "istProgress", papi: "papiProgress", disc: "discProgress", "love-language": "loveLanguageProgress", kraepelin: "kraepelinProgress", hexaco: "hexacoResponses" };
export const backupKey = (uid: string, test: TestId) => `${prefixes[test]}:${uid}`;
type Entry = { uid: string; test: TestId; raw: string | null; revision: number; dirty: boolean; localOk: boolean; warning: string; timer?: ReturnType<typeof setTimeout>; running?: Promise<void>; stopped?: boolean };
const entries = new Map<string, Entry>();
const EVENT = "assessment-backup-change";
function emit() { if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT)); }
function readLocal(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function persist(entry: Entry) {
  try {
    const key = backupKey(entry.uid, entry.test);
    if (entry.raw !== null) localStorage.setItem(key, entry.raw);
    localStorage.setItem(`${key}:sync`, JSON.stringify({ revision: entry.revision, dirty: entry.dirty }));
    entry.localOk = true;
  } catch { entry.localOk = false; }
  emit();
}
function getEntry(uid: string, test: TestId) {
  const key = backupKey(uid, test);
  let entry = entries.get(key);
  if (!entry) {
    let meta: { revision?: number; dirty?: boolean } = {};
    try { meta = JSON.parse(readLocal(`${key}:sync`) ?? "{}"); } catch { /* Legacy backup. */ }
    const raw = readLocal(key);
    entry = { uid, test, raw, revision: Number.isInteger(meta.revision) ? meta.revision! : 0, dirty: meta.dirty ?? raw !== null, localOk: true, warning: "" };
    entries.set(key, entry);
  }
  return entry;
}
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function assessmentRequest(uid: string, test: TestId, action: "progress" | "submit", method = "GET", body?: unknown) {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new ApiError(401, "Sesi berubah. Silakan masuk dengan akun kandidat yang sama.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const token = await user.getIdToken();
    const response = await fetch(`/api/assessments/${test}/${action}`, {
      method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal, cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new ApiError(response.status, data.error ?? "Permintaan gagal.");
    return data;
  } finally { clearTimeout(timeout); }
}

function queue(entry: Entry) {
  if (entry.stopped || entry.timer || entry.running) return;
  entry.timer = setTimeout(() => { entry.timer = undefined; void flush(entry); }, 1500);
}
async function flush(entry: Entry): Promise<void> {
  if (entry.running) return entry.running;
  if (!entry.dirty || entry.raw === null || entry.stopped) return;
  const raw = entry.raw;
  entry.running = (async () => {
    try {
      const result = await assessmentRequest(entry.uid, entry.test, "progress", "PUT", { revision: entry.revision, data: JSON.parse(raw) });
      if (entry.stopped) return;
      entry.revision = result.revision;
      entry.dirty = entry.raw !== raw;
      entry.warning = "";
      persist(entry);
    } catch (error) {
      if (entry.stopped) return;
      entry.warning = error instanceof ApiError ? error.message : "Cadangan server belum tersimpan. Periksa koneksi dan coba lagi.";
      if (error instanceof ApiError && error.status === 409) entry.stopped = true;
      emit();
    }
  })();
  await entry.running;
  entry.running = undefined;
  if (entry.dirty && !entry.warning) queue(entry);
}

export function saveBackup(uid: string, test: TestId, data: unknown) {
  const entry = getEntry(uid, test);
  entry.raw = JSON.stringify(data);
  entry.dirty = true;
  persist(entry);
  queue(entry);
}
export function readBackup(uid: string, test: TestId) { return getEntry(uid, test).raw; }

export async function restoreBackup(uid: string, test: TestId) {
  const entry = getEntry(uid, test);
  if (entry.running) await entry.running;
  try {
    const remote = await assessmentRequest(uid, test, "progress");
    if (entry.dirty && entry.raw !== null && remote.revision > entry.revision && JSON.stringify(remote.data) !== entry.raw) {
      entry.warning = "Ada cadangan berbeda di server dan perangkat ini. Hubungi pengawas sebelum melanjutkan; jangan hapus data browser.";
      entry.stopped = true;
      emit();
      throw new ApiError(409, entry.warning);
    }
    if (!entry.dirty || entry.raw === null) entry.raw = remote.data === null ? null : JSON.stringify(remote.data);
    entry.revision = remote.revision;
    entry.warning = "";
    entry.stopped = false;
    persist(entry);
    if (entry.dirty) queue(entry);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) throw error;
    entry.warning = "Cadangan server belum dapat diperiksa. Jangan pindah perangkat atau menghapus data browser.";
    emit();
    // Never silently start over when a remote-only backup might exist.
    if (entry.raw === null) throw error;
  }
}

export async function submitAnswers(uid: string, test: TestId, answers: unknown, startedAt?: number | null): Promise<{ score?: KraepelinScore }> {
  const entry = getEntry(uid, test);
  if (entry.stopped) throw new Error(entry.warning || "Progres perlu diperiksa pengawas.");
  clearTimeout(entry.timer);
  entry.timer = undefined;
  if (entry.running) await entry.running;
  if (entry.stopped) throw new Error(entry.warning);
  const result = await assessmentRequest(uid, test, "submit", "POST", { answers, ...(startedAt === undefined ? {} : { startedAt }) });
  if (result.completed !== true) throw new Error("Penyimpanan hasil belum dikonfirmasi.");
  entry.stopped = true;
  clearTimeout(entry.timer);
  entry.raw = null;
  entry.dirty = false;
  entry.warning = "";
  try { localStorage.removeItem(backupKey(uid, test)); localStorage.removeItem(`${backupKey(uid, test)}:sync`); } catch { /* Result already committed. */ }
  emit();
  return result;
}

export function backupStatus(uid: string, test: TestId) {
  const e = entries.get(backupKey(uid, test));
  if (!e || (e.stopped && !e.warning)) return "";
  return e.warning || (!e.localOk ? "Cadangan perangkat tidak tersedia. Pastikan cadangan server tersimpan sebelum meninggalkan halaman." : e.dirty ? "Menyimpan cadangan jawaban ke server…" : "");
}
export function subscribeBackup(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
export function retryBackup(uid: string, test: TestId) { const e = getEntry(uid, test); if (!e.stopped) void flush(e); }
