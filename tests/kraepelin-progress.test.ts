import assert from "node:assert/strict";
import { test } from "node:test";
import { GRID } from "../lib/kraepelin/grid";
import { COLUMN_MS, COUNTDOWN_MS, advanceProgress, emptyColumn, newProgress, parseProgress } from "../lib/kraepelin/progress";

const T0 = 1_800_000_000_000;
const filled = (digit: string) => emptyColumn().map(() => digit);

test("mulai tes: hitung mundur 3 detik lalu kolom 15 detik", () => {
  const start = newProgress(T0);
  assert.equal(start.phase, "countdown");
  assert.equal(start.deadline, T0 + COUNTDOWN_MS);
  const col = advanceProgress(start, T0 + COUNTDOWN_MS);
  assert.equal(col.phase, "test");
  assert.equal(col.deadline, T0 + COUNTDOWN_MS + COLUMN_MS);
});

test("refresh di tengah kolom mempertahankan sisa waktu dan jawaban kolom aktif", () => {
  const saved = { colIdx: 3, columns: [filled("1"), filled("2"), filled("3")], current: filled("4"), phase: "test" as const, deadline: T0 + 6_000 };
  const restored = parseProgress(JSON.stringify(saved), T0);
  assert.equal(restored?.phase, "test");
  assert.equal(restored?.deadline, T0 + 6_000, "tidak boleh mendapat 15 detik baru");
  assert.deepEqual(restored?.current, filled("4"));
  assert.equal(restored?.colIdx, 3);
});

test("tab ditutup: waktu tetap berjalan dan kolom aktif disimpan apa adanya", () => {
  const saved = { colIdx: 0, columns: [], current: filled("7"), phase: "test" as const, deadline: T0 + 1_000 };
  // Kembali 40 detik kemudian: kolom 1 berakhir T0+1s, kolom 2 T0+19s, kolom 3 T0+37s, kolom 4 sedang berjalan.
  const restored = parseProgress(JSON.stringify(saved), T0 + 40_000)!;
  assert.equal(restored.colIdx, 3);
  assert.deepEqual(restored.columns[0], filled("7"));
  assert.deepEqual(restored.columns[1], emptyColumn());
  assert.equal(restored.phase, "test");
  assert.equal(restored.deadline, T0 + 1_000 + 3 * (COUNTDOWN_MS + COLUMN_MS));
});

test("semua kolom habis waktunya menghasilkan fase done", () => {
  const restored = parseProgress(JSON.stringify(newProgress(T0)), T0 + GRID.length * (COUNTDOWN_MS + COLUMN_MS))!;
  assert.equal(restored.phase, "done");
  assert.equal(restored.columns.length, GRID.length);
});

test("cadangan lama (tanpa kolom aktif) melanjutkan dari kolom yang sudah selesai", () => {
  const restored = parseProgress(JSON.stringify({ colIdx: 2, columns: [filled("1"), filled("2")] }), T0)!;
  assert.equal(restored.colIdx, 2);
  assert.equal(restored.phase, "countdown");
});

test("cadangan rusak ditolak, bukan diam-diam dimulai ulang", () => {
  assert.throws(() => parseProgress(JSON.stringify({ colIdx: 2, columns: [filled("1")] }), T0));
  assert.throws(() => parseProgress(JSON.stringify({ colIdx: 0, columns: [], current: ["x"], phase: "test", deadline: T0 }), T0));
  assert.equal(parseProgress(null, T0), null);
});
