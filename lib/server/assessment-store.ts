import "server-only";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { isProfileComplete } from "../assessment/profile";
import { COLLECTIONS, isRecord, isCompletedSession, validAnswers, validDraft, type TestId } from "../assessment/validation";
import { scoreIst, type IstAnswers } from "../ist/scorer";
import { scoreKraepelin } from "../kraepelin/scorer";
import { GRID } from "../kraepelin/grid";
import { calculateAll } from "../hexaco/calculator";
import type { Response as HexacoAnswers } from "../types/hexaco";
import { HttpError } from "./assessment-http";

export function progressRef(db: Firestore, uid: string, test: TestId) {
  return db.doc(`assessmentProgress/${uid}/tests/${test}`);
}

// The fixed document ID and transaction make retries (including lost responses) idempotent.
export async function submitAssessment(db: Firestore, uid: string, test: TestId, body: unknown) {
  if (!isRecord(body) || Object.keys(body).some(k => !["answers", "startedAt"].includes(k)) || !validAnswers(test, body.answers)) {
    throw new HttpError(400, "Jawaban tidak lengkap atau format jawaban tidak valid.");
  }
  const start = body.startedAt;
  if (start !== undefined && start !== null && !(typeof start === "number" && Number.isFinite(start) && start > 0 && start <= Date.now())) {
    throw new HttpError(400, "Waktu mulai tidak valid.");
  }
  const target = db.doc(`${COLLECTIONS[test]}/${uid}`);
  const candidateRef = db.doc(`hexacoCandidates/${uid}`);
  const draftRef = progressRef(db, uid, test);
  return db.runTransaction(async tx => {
    const [existing, candidate, draft] = await Promise.all([tx.get(target), tx.get(candidateRef), tx.get(draftRef)]);
    // Preserve legacy random HEXACO document IDs; never generate a second result.
    const legacyId = test === "hexaco" && candidate.data()?.hasSubmitted === true ? candidate.data()?.sessionId : null;
    if (typeof legacyId === "string" && legacyId !== uid && !legacyId.includes("/")) {
      const legacy = await tx.get(db.doc(`hexacoSessions/${legacyId}`));
      if (!isCompletedSession(test, legacy.data(), uid)) throw new HttpError(409, "Hasil lama perlu diperiksa tim HCGA.");
      tx.delete(draftRef);
      return { completed: true, alreadySubmitted: true };
    }
    if (existing.exists) {
      if (!isCompletedSession(test, existing.data(), uid)) throw new HttpError(409, "Hasil tersimpan perlu diperiksa tim HCGA; jangan mengulang tes.");
      tx.delete(draftRef);
      return { completed: true, alreadySubmitted: true, ...(test === "kraepelin" ? { score: scoreKraepelin((existing.data()!.answers as { values: string[] }[]).map(c => c.values), GRID) } : {}) };
    }
    const profile = candidate.data();
    // Syarat sama dengan guard hub/halaman tes; HEXACO juga menyalin email ke hasil.
    if (!profile || !isProfileComplete(profile) || (test === "hexaco" && typeof profile.email !== "string")) {
      throw new HttpError(409, "Lengkapi data diri (nama, jenis kelamin, pendidikan, tanggal lahir) sebelum mengirim jawaban.");
    }
    const base = { candidateId: uid, submittedAt: FieldValue.serverTimestamp(), hasSubmitted: true, schemaVersion: 2, scoreSource: "server" };
    let result: Record<string, unknown>;
    if (test === "ist") result = { ...base, answers: body.answers, scores: scoreIst(body.answers as IstAnswers).scores };
    else if (test === "kraepelin") result = { ...base, answers: (body.answers as string[][]).map(values => ({ values })), ...scoreKraepelin(body.answers as string[][], GRID) };
    else if (test === "hexaco") result = {
      ...base, responses: body.answers, scores: calculateAll(body.answers as HexacoAnswers), status: "completed",
      email: profile.email, nama: profile.nama, pendidikan: profile.pendidikan, tanggalLahir: profile.tanggalLahir,
    };
    else result = { ...base, answers: body.answers, ...(["disc", "love-language"].includes(test) ? {
      startedAt: draft.data()?.createdAt ?? FieldValue.serverTimestamp(),
      ...(typeof start === "number" ? { clientStartedAt: Timestamp.fromMillis(start) } : {}),
    } : {}) };
    tx.create(target, result);
    if (test === "hexaco") tx.update(candidateRef, { hasSubmitted: true, sessionId: uid });
    tx.delete(draftRef);
    return { completed: true, alreadySubmitted: false, ...(test === "kraepelin" ? { score: scoreKraepelin(body.answers as string[][], GRID) } : {}) };
  });
}

export async function saveDraft(db: Firestore, uid: string, test: TestId, body: unknown) {
  if (!isRecord(body) || Object.keys(body).some(k => !["revision", "data"].includes(k)) ||
    !Number.isInteger(body.revision) || Number(body.revision) < 0 || !validDraft(test, body.data)) {
    throw new HttpError(400, "Cadangan tidak valid.");
  }
  const ref = progressRef(db, uid, test);
  return db.runTransaction(async tx => {
    const [current, final, candidate] = await Promise.all([
      tx.get(ref), tx.get(db.doc(`${COLLECTIONS[test]}/${uid}`)), tx.get(db.doc(`hexacoCandidates/${uid}`)),
    ]);
    if (!candidate.exists) throw new HttpError(409, "Lengkapi profil sebelum memulai.");
    if (final.exists || (test === "hexaco" && candidate.data()?.hasSubmitted === true)) throw new HttpError(409, "Tes ini sudah dikirim. Muat ulang halaman.");
    const revision = current.data()?.revision ?? 0;
    const payload = JSON.stringify(body.data);
    // A retried backup with an identical payload is safe even if its response was lost.
    if (current.data()?.payload === payload) return { revision };
    if (revision !== body.revision) throw new HttpError(409, "Ada progres lain yang lebih baru. Jangan lanjut di dua tab/perangkat; hubungi pengawas sebelum memuat ulang.");
    tx.set(ref, { candidateId: uid, test, payload, revision: revision + 1, updatedAt: FieldValue.serverTimestamp(), createdAt: current.data()?.createdAt ?? FieldValue.serverTimestamp() });
    return { revision: revision + 1 };
  });
}
