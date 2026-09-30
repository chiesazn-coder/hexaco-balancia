import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { HOME_PATH, postLoginDestination, testCardState, type TestStatus } from "../lib/assessment/progress";

describe("kartu Tes Psikotes di beranda", () => {
  const five = (...statuses: TestStatus[]) => statuses;

  test("belum ada tes yang dimulai -> Mulai Tes", () => {
    assert.equal(testCardState(five("available", "available", "available", "available", "available")), "start");
  });

  test("ada tes yang sedang dikerjakan -> Lanjutkan Tes", () => {
    assert.equal(testCardState(five("available", "in_progress", "available", "available", "available")), "continue");
  });

  test("sebagian tes selesai -> Lanjutkan Tes", () => {
    assert.equal(testCardState(five("completed", "available", "available", "available", "available")), "continue");
    assert.equal(testCardState(five("completed", "completed", "completed", "completed", "in_progress")), "continue");
  });

  test("semua tes selesai -> selesai, tanpa tombol ke hub", () => {
    assert.equal(testCardState(five("completed", "completed", "completed", "completed", "completed")), "done");
  });

  test("tidak ada keadaan selain semua-selesai yang dianggap selesai", () => {
    const values: TestStatus[] = ["completed", "in_progress", "available"];
    for (const a of values) for (const b of values) {
      const statuses = five("completed", "completed", "completed", a, b);
      assert.equal(testCardState(statuses) === "done", a === "completed" && b === "completed", JSON.stringify(statuses));
    }
    assert.notEqual(testCardState([]), "done");
  });
});

describe("tujuan setelah login/profil", () => {
  test("profil lengkap tanpa next -> beranda", () => {
    assert.equal(HOME_PATH, "/beranda");
    assert.equal(postLoginDestination(true, null), "/beranda");
  });

  test("profil lengkap dengan next -> tujuan next", () => {
    assert.equal(postLoginDestination(true, "/test/data-diri"), "/test/data-diri");
  });

  test("profil belum lengkap -> profil, membawa next bila ada", () => {
    assert.equal(postLoginDestination(false, null), "/profile");
    assert.equal(postLoginDestination(false, "/test/data-diri"), "/profile?next=%2Ftest%2Fdata-diri");
  });

  test("tidak pernah langsung ke hub atau halaman terima kasih", () => {
    for (const complete of [true, false]) for (const next of [null, "/test/data-diri"]) {
      assert.ok(!/test-hub|thankyou/.test(postLoginDestination(complete, next)));
    }
  });
});
