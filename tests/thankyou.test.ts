import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";
import {
  DATA_DIRI_READ_TIMEOUT_MS,
  LATE_ADDED_LAUNCH_MS,
  canShowThankYou,
  getSubmittedMs,
  runThankYouCheck,
  withTimeout,
  type KraepelinRead,
  type ThankYouDeps,
} from "../lib/assessment/thankyou";

// Urutan tes yang tampil di hub (VISIBLE_SUB_TESTS); HEXACO tersembunyi dan tidak ikut.
const VISIBLE = [{ id: "ist" }, { id: "papi" }, { id: "disc" }, { id: "love-language" }, { id: "kraepelin" }];
const allDone = () => VISIBLE.map(() => true);
const missing = (id: string) => VISIBLE.map((subTest) => subTest.id !== id);
const before = (id: string) => LATE_ADDED_LAUNCH_MS[id] - 1;

describe("syarat halaman terima kasih dan masa tenggang", () => {
  test("semua tes selesai -> boleh", () => {
    assert.equal(canShowThankYou(VISIBLE, allDone(), null), true);
  });

  test("Kraepelin selalu wajib, termasuk tanpa tanggal submit", () => {
    assert.equal(canShowThankYou(VISIBLE, missing("kraepelin"), null), false);
    assert.equal(canShowThankYou(VISIBLE, missing("kraepelin"), 0), false);
  });

  test("tes tersembunyi tidak wajib", () => {
    const withHidden = [...VISIBLE, { id: "hexaco", hidden: true }];
    assert.equal(canShowThankYou(withHidden, [...allDone(), false], null), true);
  });

  test("tes belakangan dibebaskan hanya bila Kraepelin disubmit sebelum peluncuran tes itu", () => {
    for (const id of ["ist", "papi", "disc", "love-language"]) {
      assert.equal(canShowThankYou(VISIBLE, missing(id), before(id)), true, id + " sebelum peluncuran");
      assert.equal(canShowThankYou(VISIBLE, missing(id), LATE_ADDED_LAUNCH_MS[id]), false, id + " tepat saat peluncuran");
      assert.equal(canShowThankYou(VISIBLE, missing(id), LATE_ADDED_LAUNCH_MS[id] + 1), false, id + " setelah peluncuran");
      assert.equal(canShowThankYou(VISIBLE, missing(id), null), false, id + " tanpa tanggal submit");
    }
  });

  test("cutoff per tes, bukan satu cutoff global", () => {
    // Submit Kraepelin setelah IST diluncurkan tetapi sebelum PAPI: PAPI dibebaskan, IST tidak.
    const between = LATE_ADDED_LAUNCH_MS.ist + 1;
    assert.ok(between < LATE_ADDED_LAUNCH_MS.papi);
    assert.equal(canShowThankYou(VISIBLE, missing("papi"), between), true);
    assert.equal(canShowThankYou(VISIBLE, missing("ist"), between), false);
    const both = VISIBLE.map((subTest) => subTest.id !== "ist" && subTest.id !== "papi");
    assert.equal(canShowThankYou(VISIBLE, both, before("ist")), true);
    assert.equal(canShowThankYou(VISIBLE, both, between), false);
  });

  test("tanggal peluncuran tidak berubah", () => {
    assert.deepEqual(
      Object.fromEntries(Object.entries(LATE_ADDED_LAUNCH_MS).map(([id, ms]) => [id, new Date(ms).toISOString()])),
      {
        ist: "2026-09-20T17:00:00.000Z",
        papi: "2026-09-21T17:00:00.000Z",
        hexaco: "2026-09-23T17:00:00.000Z",
        disc: "2026-09-24T17:00:00.000Z",
        "love-language": "2026-09-25T17:00:00.000Z",
      },
    );
  });

  test("tanggal submit dibaca dari Timestamp", () => {
    assert.equal(getSubmittedMs({ submittedAt: { toMillis: () => 42 } }), 42);
    assert.equal(getSubmittedMs({}), null);
    assert.equal(getSubmittedMs(undefined), null);
    assert.equal(getSubmittedMs({ submittedAt: {} }), null);
  });
});

// Dependensi palsu: semua tes selesai, Data Diri terkirim; setiap panggilan dicatat berurutan.
function fakeDeps(overrides: Partial<ThankYouDeps> = {}) {
  const calls: string[] = [];
  const kraepelin: KraepelinRead = { exists: true, valid: true, submittedMs: Date.parse("2026-09-29T00:00:00+07:00") };
  const deps: ThankYouDeps = {
    subTests: VISIBLE.map((subTest) => ({ ...subTest, isCompleted: async () => { calls.push("read:" + subTest.id); return true; } })),
    readKraepelin: async () => { calls.push("read:kraepelinSessions"); return kraepelin; },
    readDataDiriSubmitted: async () => { calls.push("read:dataDiri"); return true; },
    isActive: () => true,
    toHub: () => { calls.push("toHub"); },
    onVerified: (submitted) => { calls.push("verified:" + submitted); },
    signOut: async () => { calls.push("signOut"); },
    dataDiriTimeoutMs: 50,
    ...overrides,
  };
  return { deps, calls };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe("halaman terima kasih: baca Data Diri dan logout", () => {
  test("batas tunggu baca Data Diri 3 detik", () => {
    assert.equal(DATA_DIRI_READ_TIMEOUT_MS, 3000);
  });

  test("Data Diri terkirim -> tanpa pengingat, lalu logout", async () => {
    const { deps, calls } = fakeDeps();
    assert.equal(await runThankYouCheck(deps), "done");
    assert.ok(calls.includes("verified:true"));
    // Status ditampilkan sebelum logout (callback auth setelah logout menerima user null).
    assert.deepEqual(calls.slice(-2), ["verified:true", "signOut"]);
  });

  test("Data Diri belum terkirim -> pengingat, tetap logout", async () => {
    const { deps, calls } = fakeDeps({ readDataDiriSubmitted: async () => false });
    assert.equal(await runThankYouCheck(deps), "done");
    assert.deepEqual(calls.slice(-2), ["verified:false", "signOut"]);
  });

  test("baca Data Diri gagal (termasuk lemparan sinkron) -> pengingat, tetap logout", async () => {
    for (const read of [async () => { throw new Error("permission-denied"); }, () => { throw new Error("sync"); }]) {
      const { deps, calls } = fakeDeps({ readDataDiriSubmitted: read as () => Promise<boolean> });
      assert.equal(await runThankYouCheck(deps), "done");
      assert.deepEqual(calls.slice(-2), ["verified:false", "signOut"]);
    }
  });

  test("baca Data Diri menggantung -> berhenti setelah batas waktu, pengingat, tetap logout", async () => {
    const { deps, calls } = fakeDeps({ readDataDiriSubmitted: () => new Promise<boolean>(() => undefined) });
    const started = Date.now();
    assert.equal(await runThankYouCheck(deps), "done");
    assert.ok(Date.now() - started < 1000);
    assert.deepEqual(calls.slice(-2), ["verified:false", "signOut"]);
  });

  test("logout gagal tidak membuat pemeriksaan gagal", async () => {
    const { deps, calls } = fakeDeps({ signOut: async () => { calls.push("signOut"); throw new Error("offline"); } });
    assert.equal(await runThankYouCheck(deps), "done");
    assert.equal(calls.at(-1), "signOut");
  });

  test("Data Diri dibaca paralel dengan pemeriksaan tes", async () => {
    const kraepelin = deferred<KraepelinRead>();
    const { deps, calls } = fakeDeps({ readKraepelin: () => kraepelin.promise });
    const run = runThankYouCheck(deps);
    await new Promise((resolve) => setImmediate(resolve));
    // Pembacaan Kraepelin belum selesai, tetapi Data Diri dan tes lain sudah dibaca.
    assert.ok(calls.includes("read:dataDiri"));
    assert.ok(calls.includes("read:ist"));
    assert.ok(!calls.includes("signOut"));
    kraepelin.resolve({ exists: true, valid: true, submittedMs: null });
    assert.equal(await run, "done");
  });

  test("ada tes wajib yang belum selesai -> ke hub, tanpa logout", async () => {
    const { deps, calls } = fakeDeps({ readKraepelin: async () => ({ exists: false, valid: false, submittedMs: null }) });
    assert.equal(await runThankYouCheck(deps), "hub");
    assert.ok(calls.includes("toHub"));
    assert.ok(!calls.includes("signOut") && !calls.some((call) => call.startsWith("verified")));
  });

  test("hasil Kraepelin tidak sah -> galat, tanpa logout", async () => {
    const { deps, calls } = fakeDeps({ readKraepelin: async () => ({ exists: true, valid: false, submittedMs: null }) });
    await assert.rejects(runThankYouCheck(deps), /Kraepelin/);
    assert.ok(!calls.includes("signOut"));
  });

  test("baca tes gagal -> galat, tanpa logout", async () => {
    const { deps, calls } = fakeDeps();
    deps.subTests = deps.subTests.map((subTest) => (subTest.id === "papi" ? { ...subTest, isCompleted: async () => { throw new Error("offline"); } } : subTest));
    await assert.rejects(runThankYouCheck(deps), /offline/);
    assert.ok(!calls.includes("signOut"));
  });

  test("halaman sudah ditinggalkan -> tidak mengalihkan dan tidak logout", async () => {
    const { deps, calls } = fakeDeps({ isActive: () => false });
    assert.equal(await runThankYouCheck(deps), "inactive");
    assert.ok(!calls.includes("signOut") && !calls.includes("toHub"));
  });
});

describe("withTimeout", () => {
  test("nilai cadangan tepat setelah batas waktu, bukan sebelumnya", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      let result: boolean | undefined;
      void withTimeout(new Promise<boolean>(() => undefined), DATA_DIRI_READ_TIMEOUT_MS, false).then((value) => { result = value; });
      mock.timers.tick(DATA_DIRI_READ_TIMEOUT_MS - 1);
      await Promise.resolve();
      assert.equal(result, undefined);
      mock.timers.tick(1);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(result, false);
    } finally {
      mock.timers.reset();
    }
  });

  test("hasil asli bila selesai lebih dulu", async () => {
    assert.equal(await withTimeout(Promise.resolve(true), 1000, false), true);
  });
});
