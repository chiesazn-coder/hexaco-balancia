// Butuh Firestore Emulator (npm run test:emulator). Dilewati bila FIRESTORE_EMULATOR_HOST tidak diset,
// agar tidak pernah menyentuh database produksi.
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { deleteApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { progressRef, saveDraft, submitAssessment } from "../lib/server/assessment-store";
import { HttpError, authenticate, bodyLimit, failure, readBody, routeContext } from "../lib/server/assessment-http";
import { isCompletedSession } from "../lib/assessment/validation";
import { emptyPersonalData } from "../lib/assessment/personal-data";
import { completeForm } from "./fixtures/personal-data";
import { IST_SUBTESTS } from "../lib/ist/subtests";
import { scoreIst, type IstAnswers } from "../lib/ist/scorer";
import { GRID } from "../lib/kraepelin/grid";
import { scoreKraepelin } from "../lib/kraepelin/scorer";
import { PAPI_QUESTIONS } from "../lib/papi/questions";
import { DISC_GROUPS } from "../lib/disc/questions";
import { LOVE_LANGUAGE_ITEMS } from "../lib/love-language/love-language-questions";

const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
let db: Firestore;
let n = 0;
const year = new Date().getFullYear();
const profile = { nama: "Calon Uji", jenisKelamin: "Perempuan", pendidikan: "S1", tanggalLahir: `${year - 28}-03-04`, email: "uji@example.com", hasSubmitted: false };

async function candidate(data: Record<string, unknown> = profile) {
  const uid = `cand-${process.pid}-${++n}`;
  await db.doc(`hexacoCandidates/${uid}`).set(data);
  return uid;
}
async function rejects(promise: Promise<unknown>, status: number) {
  await assert.rejects(promise, (e: { status?: number }) => e.status === status);
}

const papi = () => PAPI_QUESTIONS.map((_, i) => (i % 2 ? "a" : "b"));
const disc = () => DISC_GROUPS.map(g => ({ group: g.no, m: 1, l: 2 }));
const love = () => LOVE_LANGUAGE_ITEMS.map(item => item.options[0].letter);
const kraepelin = () => GRID.map(col => col.slice(0, -1).map((v, j) => (j % 5 === 4 ? "" : String((v + col[j + 1]) % 10))));
function ist(): IstAnswers {
  // Campuran jawaban dan null (waktu habis) yang sah untuk tiap jenis soal.
  return Object.fromEntries(IST_SUBTESTS.map(s => [s.key, s.questions.map((_, i) => i % 3 === 2 ? null :
    s.kind === "text" ? "hewan" : s.kind === "sequence" || s.kind === "word-problem" ? "12" : "c")])) as unknown as IstAnswers;
}

describe("API asesmen (Firestore Emulator)", { skip: !emulator && "FIRESTORE_EMULATOR_HOST tidak diset" }, () => {
  before(async () => {
    await Promise.all(getApps().map(app => deleteApp(app)));
    db = getFirestore(initializeApp({ projectId: "demo-hexaco" }, "store-test"));
  });

  test("submit PAPI tersimpan dengan field server", async () => {
    const uid = await candidate();
    const result = await submitAssessment(db, uid, "papi", { answers: papi() });
    assert.deepEqual(result, { completed: true, alreadySubmitted: false });
    const saved = (await db.doc(`papiSessions/${uid}`).get()).data()!;
    assert.equal(saved.candidateId, uid);
    assert.equal(saved.hasSubmitted, true);
    assert.equal(saved.scoreSource, "server");
    assert.ok(saved.submittedAt.toDate() instanceof Date, "submittedAt harus waktu server");
  });

  test("kirim ulang dikenali dan tidak menimpa hasil pertama", async () => {
    const uid = await candidate();
    await submitAssessment(db, uid, "papi", { answers: papi() });
    const again = await submitAssessment(db, uid, "papi", { answers: papi().map(() => "a") });
    assert.equal(again.alreadySubmitted, true);
    const saved = (await db.doc(`papiSessions/${uid}`).get()).data()!;
    assert.deepEqual(saved.answers, papi());
  });

  test("kirim ulang bersamaan hanya menghasilkan satu dokumen", async () => {
    const uid = await candidate();
    const results = await Promise.all([1, 2, 3].map(() => submitAssessment(db, uid, "disc", { answers: disc() })));
    assert.equal(results.filter(r => !r.alreadySubmitted).length, 1);
  });

  test("profil tidak lengkap ditolak", async () => {
    const { jenisKelamin: _omit, ...incomplete } = profile;
    await rejects(submitAssessment(db, await candidate(incomplete), "papi", { answers: papi() }), 409);
    await rejects(submitAssessment(db, await candidate({ ...profile, tanggalLahir: `${year - 10}-01-01` }), "papi", { answers: papi() }), 409);
    await rejects(submitAssessment(db, `tanpa-profil-${process.pid}`, "papi", { answers: papi() }), 409);
  });

  test("payload yang dimanipulasi ditolak", async () => {
    const uid = await candidate();
    await rejects(submitAssessment(db, uid, "papi", { answers: papi(), scores: { total: 999 } }), 400);
    await rejects(submitAssessment(db, uid, "papi", { answers: papi().slice(1) }), 400);
    await rejects(submitAssessment(db, uid, "papi", { answers: papi().map(() => "c") }), 400);
    await rejects(submitAssessment(db, uid, "disc", { answers: disc().map(a => ({ ...a, l: a.m })) }), 400);
    await rejects(submitAssessment(db, uid, "love-language", { answers: love().map(() => "Z") }), 400);
    await rejects(submitAssessment(db, uid, "papi", { answers: papi(), startedAt: Date.now() + 60_000 }), 400);
    assert.equal((await db.doc(`papiSessions/${uid}`).get()).exists, false);
  });

  test("skor IST dihitung server dan jawaban kosong karena waktu habis diterima", async () => {
    const uid = await candidate();
    const answers = ist();
    await submitAssessment(db, uid, "ist", { answers });
    const saved = (await db.doc(`istSessions/${uid}`).get()).data()!;
    assert.deepEqual(saved.scores, scoreIst(answers).scores);
  });

  test("skor Kraepelin dihitung server dan dikembalikan ke kandidat", async () => {
    const uid = await candidate();
    const answers = kraepelin();
    const result = await submitAssessment(db, uid, "kraepelin", { answers });
    const expected = scoreKraepelin(answers, GRID);
    assert.deepEqual(result.score, expected);
    const saved = (await db.doc(`kraepelinSessions/${uid}`).get()).data()!;
    assert.equal(saved.errors, expected.errors);
    assert.deepEqual(saved.answers[0].values, answers[0]);
    const again = await submitAssessment(db, uid, "kraepelin", { answers });
    assert.deepEqual(again.score, expected, "kirim ulang tetap menampilkan skor");
  });

  test("Love Language dan DISC mencatat waktu mulai dari server", async () => {
    const uid = await candidate();
    await saveDraft(db, uid, "love-language", { revision: 0, data: { answers: love().map(() => null), startedAt: Date.now() - 1000 } });
    await submitAssessment(db, uid, "love-language", { answers: love(), startedAt: Date.now() - 1000 });
    const saved = (await db.doc(`loveLanguageSessions/${uid}`).get()).data()!;
    assert.ok(saved.startedAt.toDate() instanceof Date);
    assert.ok(saved.clientStartedAt.toDate() instanceof Date);
  });

  test("cadangan progres: revisi, retry aman, konflik dua tab, dan dihapus setelah submit", async () => {
    const uid = await candidate();
    const draft = { answers: papi().map((v, i) => (i < 10 ? v : null)), startedAt: null };
    assert.deepEqual(await saveDraft(db, uid, "papi", { revision: 0, data: draft }), { revision: 1 });
    // Respons hilang lalu dikirim ulang dengan payload sama: tetap sukses.
    assert.deepEqual(await saveDraft(db, uid, "papi", { revision: 0, data: draft }), { revision: 1 });
    // Tab lain dengan revisi lama dan isi berbeda ditolak.
    await rejects(saveDraft(db, uid, "papi", { revision: 0, data: { ...draft, answers: draft.answers.map(() => null) } }), 409);
    assert.deepEqual(await saveDraft(db, uid, "papi", { revision: 1, data: { ...draft, startedAt: Date.now() } }), { revision: 2 });

    await submitAssessment(db, uid, "papi", { answers: papi() });
    assert.equal((await progressRef(db, uid, "papi").get()).exists, false);
    await rejects(saveDraft(db, uid, "papi", { revision: 2, data: draft }), 409);
  });

  test("cadangan tidak valid ditolak", async () => {
    const uid = await candidate();
    await rejects(saveDraft(db, uid, "papi", { revision: 0, data: { answers: ["x"] } }), 400);
    await rejects(saveDraft(db, uid, "kraepelin", { revision: 0, data: { colIdx: 5, columns: [] } }), 400);
    await rejects(saveDraft(db, uid, "papi", { revision: -1, data: { answers: papi() } }), 400);
  });
});

describe("autentikasi API", () => {
  before(() => { process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||= "demo-hexaco"; });
  const req = (auth?: string) => new Request("http://localhost/api", { headers: auth ? { authorization: auth } : {} });

  test("tanpa token atau token palsu ditolak 401, tes tak dikenal 404", async () => {
    await rejects(authenticate(req(), "papi"), 401);
    await rejects(authenticate(req("Bearer bukan-token"), "papi"), 401);
    await rejects(authenticate(req("Bearer x"), "tes-lain"), 404);
  });
});

describe("log kegagalan API", () => {
  function capture(method: "warn" | "error", run: () => Response) {
    const original = console[method];
    const lines: string[] = [];
    console[method] = (line: string) => { lines.push(line); };
    try { return { response: run(), lines }; } finally { console[method] = original; }
  }
  const context = () => ({ ...routeContext("submit", new Request("http://localhost/api", { method: "POST" }), "ist"), uid: "cand-1" });

  test("kegagalan yang diharapkan dicatat sebagai warning tanpa mengubah respons", async () => {
    const { response, lines } = capture("warn", () => failure(new HttpError(409, "Lengkapi data diri."), context()));
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "Lengkapi data diri." });
    const log = JSON.parse(lines[0]);
    assert.equal(log.event, "assessment_request_failed");
    assert.deepEqual([log.action, log.method, log.test, log.uid, log.status, log.reason], ["submit", "POST", "ist", "cand-1", 409, "Lengkapi data diri."]);
    assert.equal(typeof log.durationMs, "number");
  });

  test("kuota Firestore habis ditandai firestore_quota, kandidat tetap melihat pesan umum", async () => {
    const quota = Object.assign(new Error("8 RESOURCE_EXHAUSTED: Quota exceeded."), { code: 8 });
    const { response, lines } = capture("error", () => failure(quota, context()));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Penyimpanan belum dapat dikonfirmasi. Tetap di halaman ini dan coba kembali." });
    const log = JSON.parse(lines[0]);
    assert.deepEqual([log.status, log.errorCode, log.hint, log.uid], [503, 8, "firestore_quota", "cand-1"]);
  });

  test("error tak terduga lain dicatat tanpa penanda kuota", () => {
    const { lines } = capture("error", () => failure(new TypeError("x is not a function"), context()));
    const log = JSON.parse(lines[0]);
    assert.deepEqual([log.errorName, log.errorMessage, log.hint], ["TypeError", "x is not a function", undefined]);
  });
});

describe("Data Diri (Firestore Emulator)", { skip: !emulator && "FIRESTORE_EMULATOR_HOST tidak diset" }, () => {
  const EMAIL = "uji@example.com";
  before(async () => {
    if (!db) {
      await Promise.all(getApps().map(app => deleteApp(app)));
      db = getFirestore(initializeApp({ projectId: "demo-hexaco" }, "store-test-data-diri"));
    }
  });

  test("submit tersimpan dengan field dari server, tanpa key jawaban tes", async () => {
    const uid = await candidate();
    const result = await submitAssessment(db, uid, "data-diri", { answers: completeForm(" Uji@Example.com ") }, EMAIL);
    assert.deepEqual(result, { completed: true, alreadySubmitted: false });
    const saved = (await db.doc(`personalDataSessions/${uid}`).get()).data()!;
    assert.equal(saved.candidateId, uid);
    assert.equal(saved.hasSubmitted, true);
    assert.equal(saved.schemaVersion, 1);
    assert.ok(saved.submittedAt.toDate() instanceof Date, "submittedAt harus waktu server");
    assert.equal(saved.identitas.email, EMAIL, "email disimpan persis sesuai akun login");
    assert.equal(saved.identitas.noKtp, "3171234567890001");
    assert.equal("answers" in saved || "scoreSource" in saved, false);
    assert.ok(isCompletedSession("data-diri", saved, uid));
  });

  test("email berbeda dari akun login atau akun tanpa email ditolak", async () => {
    const uid = await candidate();
    await rejects(submitAssessment(db, uid, "data-diri", { answers: completeForm("lain@example.com") }, EMAIL), 400);
    await rejects(submitAssessment(db, uid, "data-diri", { answers: completeForm() }, undefined), 400);
    assert.equal((await db.doc(`personalDataSessions/${uid}`).get()).exists, false);
  });

  test("field wajib kosong atau key asing ditolak tanpa membuat dokumen", async () => {
    const uid = await candidate();
    const noKtp = completeForm(); noKtp.identitas.noKtp = "";
    await rejects(submitAssessment(db, uid, "data-diri", { answers: noKtp }, EMAIL), 400);
    await rejects(submitAssessment(db, uid, "data-diri", { answers: { ...completeForm(), candidateId: "orang-lain", hasSubmitted: true } }, EMAIL), 400);
    await rejects(submitAssessment(db, uid, "data-diri", { answers: emptyPersonalData() }, EMAIL), 400);
    assert.equal((await db.doc(`personalDataSessions/${uid}`).get()).exists, false);
  });

  test("kirim ulang dikenali dan tidak menimpa data pertama", async () => {
    const uid = await candidate();
    await submitAssessment(db, uid, "data-diri", { answers: completeForm() }, EMAIL);
    const changed = completeForm(); changed.identitas.tempatLahir = "Bandung";
    const again = await submitAssessment(db, uid, "data-diri", { answers: changed }, EMAIL);
    assert.equal(again.alreadySubmitted, true);
    assert.equal((await db.doc(`personalDataSessions/${uid}`).get()).data()!.identitas.tempatLahir, "Jakarta");
  });

  test("profil asesmen belum lengkap ditolak", async () => {
    const { jenisKelamin: _omit, ...incomplete } = profile;
    await rejects(submitAssessment(db, await candidate(incomplete), "data-diri", { answers: completeForm() }, EMAIL), 409);
  });

  test("cadangan draft: langkah wizard, konflik tab, dan dihapus setelah submit", async () => {
    const uid = await candidate();
    const draft = { step: 3, form: emptyPersonalData() };
    assert.deepEqual(await saveDraft(db, uid, "data-diri", { revision: 0, data: draft }), { revision: 1 });
    await rejects(saveDraft(db, uid, "data-diri", { revision: 0, data: { ...draft, step: 4 } }), 409);
    await rejects(saveDraft(db, uid, "data-diri", { revision: 1, data: { ...draft, step: 9 } }), 400);
    await rejects(saveDraft(db, uid, "data-diri", { revision: 1, data: { answers: [] } }), 400);
    await submitAssessment(db, uid, "data-diri", { answers: completeForm() }, EMAIL);
    assert.equal((await progressRef(db, uid, "data-diri").get()).exists, false);
    await rejects(saveDraft(db, uid, "data-diri", { revision: 1, data: draft }), 409);
  });
});

describe("batas ukuran body", () => {
  const request = (bytes: number) => new Request("http://localhost/api", { method: "PUT", body: JSON.stringify({ text: "x".repeat(bytes) }) });

  test("Data Diri 128 KB, tes lain tetap 64 KB", async () => {
    assert.equal(bodyLimit("data-diri"), 128000);
    assert.equal(bodyLimit("papi"), 64000);
    await rejects(readBody(request(70000), bodyLimit("papi")), 413);
    assert.equal(((await readBody(request(70000), bodyLimit("data-diri"))) as { text: string }).text.length, 70000);
    await rejects(readBody(request(130000), bodyLimit("data-diri")), 413);
  });
});
