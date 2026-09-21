const COLUMNS = 50;
const ROWS = 27;
const SEED = 42;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(s) % 10;
  };
}

// Deterministik: kolom demi kolom, baris demi baris. Mengubah urutan/seed mengubah seluruh grid
// (dan membuat skor sesi yang sudah tersimpan tidak bisa dihitung ulang).
function buildGrid(): number[][] {
  const random = seededRandom(SEED);
  return Array.from({ length: COLUMNS }, () => Array.from({ length: ROWS }, () => random()));
}

export const GRID: number[][] = buildGrid();
