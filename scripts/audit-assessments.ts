// Audit data asesmen di Firestore. HANYA MEMBACA: script ini tidak pernah menulis, mengubah, atau menghapus dokumen.
//
// Menjawab tiga pertanyaan sebelum rules/validasi ketat diterapkan:
//   1. Adakah hasil lama yang akan ditolak isCompletedSession (kandidat terkunci "perlu diperiksa HCGA")?
//   2. Adakah skor tersimpan yang berbeda dari hasil hitung ulang jawaban mentah (indikasi manipulasi)?
//   3. Adakah profil/sesi HEXACO yang tidak konsisten (duplikat, sessionId rusak, profil tidak lolos rules ketat)?
//
// Jalankan: npm run audit:assessments [-- --out laporan.json]
// Butuh FIREBASE_ADMIN_CLIENT_EMAIL & FIREBASE_ADMIN_PRIVATE_KEY (atau Application Default Credentials) di .env.local.
import { writeFileSync } from "node:fs";
import type { DocumentData } from "firebase-admin/firestore";
import { adminDb } from "../lib/server/firebase-admin";
import { COLLECTIONS, isCompletedSession, isRecord, validAnswers, type TestId } from "../lib/assessment/validation";
import { scoreIst, type IstAnswers } from "../lib/ist/scorer";
import { scoreKraepelin } from "../lib/kraepelin/scorer";
import { GRID } from "../lib/kraepelin/grid";
import { calculateAll } from "../lib/hexaco/calculator";
import type { Response as HexacoAnswers } from "../lib/types/hexaco";

type Issue = { id: string; detail?: string };
const report: Record<string, Record<string, Issue[]>> = {};
const counts: Record<string, number> = {};
function add(section: string, kind: string, id: string, detail?: string) {
  ((report[section] ??= {})[kind] ??= []).push(detail ? { id, detail } : { id });
}

// Toleransi kecil untuk pembulatan floating point antara versi scorer.
function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-6;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  if (isRecord(a) && isRecord(b)) {
    const keys = Object.keys(a).concat(Object.keys(b).filter(k => !Object.hasOwn(a, k)));
    return keys.every(k => sameValue(a[k], b[k]));
  }
  return a === b;
}

function answersOf(test: TestId, data: DocumentData): unknown {
  if (test === "hexaco") return data.responses;
  if (test === "kraepelin") return Array.isArray(data.answers) ? data.answers.map((c: unknown) => isRecord(c) ? c.values : null) : data.answers;
  return data.answers;
}

// Alasan pertama yang membuat isCompletedSession menolak dokumen; urutannya sama dengan fungsi aslinya.
function rejectReason(test: TestId, data: DocumentData, uid: string): string {
  if (data.candidateId !== uid) return `candidateId (${String(data.candidateId)}) tidak sama dengan pemilik`;
  if (!data.submittedAt) return "submittedAt tidak ada";
  if (test === "hexaco" ? data.status !== "completed" : data.hasSubmitted !== true) return test === "hexaco" ? `status = ${String(data.status)}` : `hasSubmitted = ${String(data.hasSubmitted)}`;
  const answers = answersOf(test, data);
  if (test === "ist" && isRecord(answers)) {
    const empty = Object.entries(answers).filter(([, list]) => Array.isArray(list) && list.includes("")).map(([k]) => k);
    if (empty.length) return `jawaban IST berisi string kosong di bagian ${empty.join(", ")}`;
  }
  return "struktur/jumlah/nilai jawaban tidak sesuai validasi baru";
}

function expectedScores(test: TestId, answers: unknown): Record<string, unknown> | null {
  if (test === "ist") return { scores: scoreIst(answers as IstAnswers).scores };
  if (test === "kraepelin") return { ...scoreKraepelin(answers as string[][], GRID) };
  if (test === "hexaco") return { scores: calculateAll(answers as HexacoAnswers) };
  return null; // PAPI, DISC, Love Language tidak menyimpan skor.
}

// Perbedaan yang bukan manipulasi: completedAt HEXACO adalah waktu perhitungan, dan hasil IST
// sebelum commit e204b26 belum menyimpan skor RA (total tetap dihitung sama).
function normalizeStored(test: TestId, key: string, stored: unknown, expected: unknown): [unknown, unknown] {
  if (test === "hexaco" && key === "scores" && isRecord(stored) && isRecord(expected)) {
    return [{ ...stored, completedAt: null }, { ...expected, completedAt: null }];
  }
  if (test === "ist" && key === "scores" && isRecord(stored) && isRecord(expected) && !("ra" in stored)) {
    return [stored, Object.fromEntries(Object.entries(expected).filter(([k]) => k !== "ra"))];
  }
  return [stored, expected];
}

async function auditSessions(test: TestId, profiles: Map<string, DocumentData>) {
  const snap = await adminDb().collection(COLLECTIONS[test]).get();
  counts[COLLECTIONS[test]] = snap.size;
  const perCandidate = new Map<string, string[]>();
  for (const doc of snap.docs) {
    const data = doc.data();
    // Semua koleksi berkunci uid, kecuali HEXACO lama yang memakai ID acak.
    const owner = test === "hexaco" ? String(data.candidateId ?? "") : doc.id;
    perCandidate.set(owner, [...(perCandidate.get(owner) ?? []), doc.id]);
    if (test === "hexaco" && doc.id !== owner) add(test, "info: ID dokumen lama (acak, bukan uid)", doc.id);
    if (!profiles.has(owner)) add(test, "sesi tanpa profil hexacoCandidates", doc.id, `candidateId=${owner}`);
    if (!isCompletedSession(test, data, owner)) {
      add(test, "DITOLAK isCompletedSession (kandidat akan terkunci)", doc.id, rejectReason(test, data, owner));
      continue;
    }
    const expected = expectedScores(test, answersOf(test, data));
    if (!expected) continue;
    for (const [key, value] of Object.entries(expected)) {
      if (!sameValue(...normalizeStored(test, key, data[key], value))) add(test, "SKOR BERBEDA dari hitung ulang", doc.id, `field ${key}`);
    }
  }
  if (test === "hexaco") {
    perCandidate.forEach((ids, owner) => { if (ids.length > 1) add(test, "SESI GANDA per kandidat", owner, ids.join(", ")); });
  }
  return perCandidate;
}

// Mengikuti blok ketat hexacoCandidates di firestore.rules dashboard.
const PROFILE_KEYS = ["nama", "jenisKelamin", "pendidikan", "tanggalLahir", "email", "hasSubmitted", "createdAt", "sessionId"];
function auditProfile(id: string, data: DocumentData) {
  const s = "hexacoCandidates";
  if (!("hasSubmitted" in data)) add(s, "tanpa field hasSubmitted (edit profil ditolak rules ketat)", id);
  const extra = Object.keys(data).filter(k => !PROFILE_KEYS.includes(k));
  if (extra.length) add(s, "field di luar daftar yang diizinkan", id, extra.join(", "));
  const invalid = [
    !(typeof data.nama === "string" && data.nama.trim()) && "nama",
    !["Laki-laki", "Perempuan"].includes(data.jenisKelamin) && "jenisKelamin",
    !["SMA/SMK", "D3", "S1", "S2", "S3"].includes(data.pendidikan) && "pendidikan",
    !(typeof data.tanggalLahir === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.tanggalLahir)) && "tanggalLahir",
    typeof data.email !== "string" && "email",
  ].filter(Boolean);
  if (invalid.length) add(s, "profil tidak lolos validasi", id, invalid.join(", "));
}

async function main() {
  const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : null;
  const profileSnap = await adminDb().collection("hexacoCandidates").get();
  counts.hexacoCandidates = profileSnap.size;
  const profiles = new Map(profileSnap.docs.map(d => [d.id, d.data()]));
  profiles.forEach((data, id) => auditProfile(id, data));

  let hexacoSessions = new Map<string, string[]>();
  for (const test of Object.keys(COLLECTIONS) as TestId[]) {
    const sessions = await auditSessions(test, profiles);
    if (test === "hexaco") hexacoSessions = sessions;
  }

  // Profil yang mengaku sudah submit HEXACO harus menunjuk sesi yang benar-benar ada.
  profiles.forEach((data, id) => {
    if (data.hasSubmitted !== true) return;
    const ids = hexacoSessions.get(id) ?? [];
    if (!ids.length) add("hexacoCandidates", "hasSubmitted=true tanpa sesi HEXACO", id);
    else if (typeof data.sessionId !== "string" || !ids.includes(data.sessionId)) add("hexacoCandidates", "sessionId tidak menunjuk sesi milik kandidat", id, `sessionId=${String(data.sessionId)}`);
  });

  console.log("Jumlah dokumen:", counts);
  const sections = Object.entries(report);
  if (!sections.length) console.log("\nTidak ada temuan.");
  for (const [section, kinds] of sections) {
    console.log(`\n== ${section}`);
    for (const [kind, issues] of Object.entries(kinds)) {
      console.log(`  ${kind}: ${issues.length}`);
      for (const issue of issues.slice(0, 20)) console.log(`    - ${issue.id}${issue.detail ? ` (${issue.detail})` : ""}`);
      if (issues.length > 20) console.log(`    … ${issues.length - 20} lainnya (lihat --out)`);
    }
  }
  if (out) {
    writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), counts, report }, null, 2));
    console.log(`\nLaporan lengkap: ${out}`);
  }
}

main().catch(error => {
  console.error("Audit gagal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
