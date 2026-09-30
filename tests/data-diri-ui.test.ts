import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { displayToIso, formatDateTyping, isoToDisplay } from "../lib/assessment/date-input";
import { emptyPersonalData, personalDataIssues, prefillFromProfile } from "../lib/assessment/personal-data";
import { hasAnyValue, wizardStepStates } from "../lib/assessment/wizard-status";

describe("kolom tanggal HH/BB/TTTT", () => {
  test("tampilan dan penyimpanan", () => {
    assert.equal(isoToDisplay("1999-03-12"), "12/03/1999");
    assert.equal(isoToDisplay(""), "");
    assert.equal(displayToIso("12/03/1999"), "1999-03-12");
    assert.equal(displayToIso("1/3/1999"), "1999-03-01");
    assert.equal(displayToIso("12-03-1999"), "1999-03-12");
    assert.equal(displayToIso("12031999"), "1999-03-12");
  });

  test("tanggal tidak nyata atau belum lengkap ditolak", () => {
    assert.equal(displayToIso("31/02/2000"), null);
    assert.equal(displayToIso("12/13/1999"), null);
    assert.equal(displayToIso("12/03/19"), null);
    assert.equal(displayToIso(""), null);
  });

  test("garis miring disisipkan saat mengetik angka", () => {
    assert.equal(formatDateTyping("12"), "12");
    assert.equal(formatDateTyping("120"), "12/0");
    assert.equal(formatDateTyping("12031999"), "12/03/1999");
    assert.equal(formatDateTyping("12/03/1999"), "12/03/1999");
    assert.equal(formatDateTyping("120319991"), "12/03/1999");
    assert.equal(formatDateTyping("1/3/1999"), "1/3/1999");
    assert.equal(formatDateTyping("12a0"), "12/0");
  });
});

describe("status langkah Data Diri", () => {
  test("isian kosong tidak dihitung terisi; jawaban Tidak dihitung", () => {
    assert.equal(hasAnyValue({ a: "", b: null, c: [], d: { e: "  " } }), false);
    assert.equal(hasAnyValue({ ya: false, keterangan: "" }), true);
    assert.equal(hasAnyValue([{ nama: "Budi" }]), true);
  });

  test("lengkap = tanpa kesalahan dan minimal satu kolom terisi", () => {
    const form = prefillFromProfile({ nama: "Budi" }, "budi@example.com");
    form.pendidikan.palingPuas = "Lulus tepat waktu";
    const states = wizardStepStates(form, personalDataIssues(form));
    assert.deepEqual(states[0], { filled: true, hasIssue: true, complete: false });
    assert.deepEqual(states[1], { filled: false, hasIssue: false, complete: false });
    assert.deepEqual(states[2], { filled: true, hasIssue: false, complete: true });
  });

  test("formulir kosong: tidak ada langkah lengkap", () => {
    const form = emptyPersonalData();
    const states = wizardStepStates(form, personalDataIssues(form));
    assert.equal(states.length, 9);
    assert.equal(states.filter((state) => state.complete).length, 0);
  });
});
